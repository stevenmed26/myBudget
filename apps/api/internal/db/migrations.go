package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

var migrationFilenamePattern = regexp.MustCompile(`^\d{3}_.+\.sql$`)

func (db *DB) RunMigrations(ctx context.Context) error {
	dir, err := resolveMigrationsDir()
	if err != nil {
		return err
	}

	files, err := filepath.Glob(filepath.Join(dir, "*.sql"))
	if err != nil {
		return err
	}
	sort.Strings(files)
	if len(files) == 0 {
		return fmt.Errorf("no migration files found in %s", dir)
	}
	if err := validateMigrationFiles(files); err != nil {
		return err
	}

	const lockID int64 = 9122842701
	if _, err := db.Pool.Exec(ctx, `SELECT pg_advisory_lock($1)`, lockID); err != nil {
		return err
	}
	defer db.Pool.Exec(ctx, `SELECT pg_advisory_unlock($1)`, lockID)

	if _, err := db.Pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`); err != nil {
		return err
	}

	for _, file := range files {
		name := filepath.Base(file)
		applied, err := db.migrationApplied(ctx, name)
		if err != nil {
			return err
		}
		if applied {
			continue
		}

		raw, err := os.ReadFile(file)
		if err != nil {
			return err
		}
		sql := strings.TrimSpace(string(raw))
		if sql == "" {
			continue
		}

		tx, err := db.Pool.Begin(ctx)
		if err != nil {
			return err
		}

		if _, err := tx.Exec(ctx, sql); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("apply migration %s: %w", name, err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations (filename) VALUES ($1)`, name); err != nil {
			tx.Rollback(ctx)
			return err
		}
		if err := tx.Commit(ctx); err != nil {
			return err
		}
		log.Printf("applied migration %s", name)
	}

	return nil
}

func validateMigrationFiles(files []string) error {
	seenPrefixes := make(map[string]string, len(files))
	for _, file := range files {
		name := filepath.Base(file)
		if !migrationFilenamePattern.MatchString(name) {
			return fmt.Errorf("invalid migration filename %s: expected format 001_description.sql", name)
		}

		prefix := name[:3]
		if existing, ok := seenPrefixes[prefix]; ok {
			return fmt.Errorf("duplicate migration prefix %s used by %s and %s", prefix, existing, name)
		}
		seenPrefixes[prefix] = name
	}
	return nil
}

func (db *DB) migrationApplied(ctx context.Context, name string) (bool, error) {
	const q = `SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE filename = $1)`
	var applied bool
	err := db.Pool.QueryRow(ctx, q, name).Scan(&applied)
	return applied, err
}

func resolveMigrationsDir() (string, error) {
	candidates := []string{}
	if envDir := strings.TrimSpace(os.Getenv("DB_MIGRATIONS_DIR")); envDir != "" {
		candidates = append(candidates, envDir)
	}
	candidates = append(candidates, "db/migrations", "../../db/migrations", "/app/db/migrations")

	for _, candidate := range candidates {
		info, err := os.Stat(candidate)
		if err == nil && info.IsDir() {
			return candidate, nil
		}
	}

	return "", fmt.Errorf("migrations directory not found")
}
