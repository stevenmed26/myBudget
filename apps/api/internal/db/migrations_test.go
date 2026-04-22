package db

import (
	"path/filepath"
	"testing"
)

func TestValidateMigrationFilesAcceptsNumberedSQLFiles(t *testing.T) {
	files := []string{
		filepath.Join("db", "migrations", "001_init.sql"),
		filepath.Join("db", "migrations", "002_budget_caps.sql"),
	}

	if err := validateMigrationFiles(files); err != nil {
		t.Fatalf("validateMigrationFiles() error = %v", err)
	}
}

func TestValidateMigrationFilesRejectsUnexpectedNames(t *testing.T) {
	files := []string{
		filepath.Join("db", "migrations", "001_init.sql"),
		filepath.Join("db", "migrations", "notes.sql"),
	}

	if err := validateMigrationFiles(files); err == nil {
		t.Fatal("validateMigrationFiles() should reject unexpected names")
	}
}

func TestValidateMigrationFilesRejectsDuplicatePrefixes(t *testing.T) {
	files := []string{
		filepath.Join("db", "migrations", "001_init.sql"),
		filepath.Join("db", "migrations", "001_other.sql"),
	}

	if err := validateMigrationFiles(files); err == nil {
		t.Fatal("validateMigrationFiles() should reject duplicate prefixes")
	}
}
