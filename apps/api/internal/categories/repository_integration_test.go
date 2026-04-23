package categories

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"mybudget-api/internal/db"
)

func TestRepositorySoftDeletePreservesHistoricalTransactions(t *testing.T) {
	database := openTestDB(t)
	defer database.Pool.Close()

	ctx := context.Background()
	if err := database.RunMigrations(ctx); err != nil {
		t.Fatalf("RunMigrations() error = %v", err)
	}

	userID := createTestUser(t, database, "category-delete")
	t.Cleanup(func() {
		_, _ = database.Pool.Exec(context.Background(), `DELETE FROM users WHERE id = $1`, userID)
	})

	repo := NewRepository(database)
	first, err := repo.Create(ctx, userID, CreateCategoryRequest{
		Name:               "Travel",
		Color:              "#3B82F6",
		CountsTowardBudget: true,
	})
	if err != nil {
		t.Fatalf("Create(first) error = %v", err)
	}

	transactionID := createTestTransaction(t, database, userID, first.ID)

	if err := repo.SoftDelete(ctx, userID, first.ID); err != nil {
		t.Fatalf("SoftDelete() error = %v", err)
	}

	second, err := repo.Create(ctx, userID, CreateCategoryRequest{
		Name:               "Travel",
		Color:              "#22C55E",
		CountsTowardBudget: true,
	})
	if err != nil {
		t.Fatalf("Create(second) error = %v", err)
	}
	if second.ID == first.ID {
		t.Fatal("Create(second) reused archived category ID")
	}

	var transactionCategoryID string
	err = database.Pool.QueryRow(ctx,
		`SELECT category_id FROM transactions WHERE id = $1`,
		transactionID,
	).Scan(&transactionCategoryID)
	if err != nil {
		t.Fatalf("load transaction category: %v", err)
	}
	if transactionCategoryID != first.ID {
		t.Fatalf("transaction category_id = %s, want archived category %s", transactionCategoryID, first.ID)
	}
}

func TestRepositorySoftDeleteDeactivatesRecurringRules(t *testing.T) {
	database := openTestDB(t)
	defer database.Pool.Close()

	ctx := context.Background()
	if err := database.RunMigrations(ctx); err != nil {
		t.Fatalf("RunMigrations() error = %v", err)
	}

	userID := createTestUser(t, database, "category-recurring")
	t.Cleanup(func() {
		_, _ = database.Pool.Exec(context.Background(), `DELETE FROM users WHERE id = $1`, userID)
	})

	repo := NewRepository(database)
	category, err := repo.Create(ctx, userID, CreateCategoryRequest{
		Name:               "Utilities",
		Color:              "#6366F1",
		CountsTowardBudget: true,
	})
	if err != nil {
		t.Fatalf("Create(category) error = %v", err)
	}
	ruleID := createTestRecurringRule(t, database, userID, category.ID)

	if err := repo.SoftDelete(ctx, userID, category.ID); err != nil {
		t.Fatalf("SoftDelete() error = %v", err)
	}

	var active bool
	err = database.Pool.QueryRow(ctx,
		`SELECT active FROM recurring_rules WHERE id = $1`,
		ruleID,
	).Scan(&active)
	if err != nil {
		t.Fatalf("load recurring rule: %v", err)
	}
	if active {
		t.Fatal("recurring rule should be inactive after deleting its category")
	}
}

func TestRepositorySoftDeleteProtectsSystemCategories(t *testing.T) {
	database := openTestDB(t)
	defer database.Pool.Close()

	ctx := context.Background()
	if err := database.RunMigrations(ctx); err != nil {
		t.Fatalf("RunMigrations() error = %v", err)
	}

	userID := createTestUser(t, database, "category-system")
	t.Cleanup(func() {
		_, _ = database.Pool.Exec(context.Background(), `DELETE FROM users WHERE id = $1`, userID)
	})

	categoryID := createTestSystemCategory(t, database, userID)
	repo := NewRepository(database)

	if err := repo.SoftDelete(ctx, userID, categoryID); err != ErrCategoryNotFound {
		t.Fatalf("SoftDelete() error = %v, want %v", err, ErrCategoryNotFound)
	}

	var archived bool
	err := database.Pool.QueryRow(ctx,
		`SELECT archived_at IS NOT NULL FROM categories WHERE id = $1`,
		categoryID,
	).Scan(&archived)
	if err != nil {
		t.Fatalf("load system category: %v", err)
	}
	if archived {
		t.Fatal("system category should not be archived")
	}
}

func openTestDB(t *testing.T) *db.DB {
	t.Helper()

	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is not set")
	}

	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		t.Fatalf("parse TEST_DATABASE_URL: %v", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		t.Fatalf("connect to test database: %v", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		t.Fatalf("ping test database: %v", err)
	}

	return &db.DB{Pool: pool}
}

func createTestUser(t *testing.T, database *db.DB, label string) string {
	t.Helper()

	email := fmt.Sprintf("%s-%d@mybudget.test", label, time.Now().UnixNano())
	var userID string
	err := database.Pool.QueryRow(context.Background(),
		`INSERT INTO users (email) VALUES ($1) RETURNING id`,
		email,
	).Scan(&userID)
	if err != nil {
		t.Fatalf("create test user: %v", err)
	}
	return userID
}

func createTestTransaction(t *testing.T, database *db.DB, userID, categoryID string) string {
	t.Helper()

	var transactionID string
	err := database.Pool.QueryRow(context.Background(), `
		INSERT INTO transactions (
			user_id, category_id, amount_cents, transaction_type, transaction_date, merchant_name
		)
		VALUES ($1, $2, 2500, 'expense', CURRENT_DATE, 'Test merchant')
		RETURNING id
	`, userID, categoryID).Scan(&transactionID)
	if err != nil {
		t.Fatalf("create test transaction: %v", err)
	}
	return transactionID
}

func createTestRecurringRule(t *testing.T, database *db.DB, userID, categoryID string) string {
	t.Helper()

	var ruleID string
	err := database.Pool.QueryRow(context.Background(), `
		INSERT INTO recurring_rules (
			user_id, category_id, name, amount_cents, rule_type,
			frequency, start_date, next_run_date, active
		)
		VALUES ($1, $2, 'Test rule', 2500, 'expense', 'monthly', CURRENT_DATE, CURRENT_DATE, TRUE)
		RETURNING id
	`, userID, categoryID).Scan(&ruleID)
	if err != nil {
		t.Fatalf("create test recurring rule: %v", err)
	}
	return ruleID
}

func createTestSystemCategory(t *testing.T, database *db.DB, userID string) string {
	t.Helper()

	var categoryID string
	err := database.Pool.QueryRow(context.Background(), `
		INSERT INTO categories (
			user_id, name, color, is_default, counts_toward_budget, is_system
		)
		VALUES ($1, 'System Test', '#EF4444', TRUE, FALSE, TRUE)
		RETURNING id
	`, userID).Scan(&categoryID)
	if err != nil {
		t.Fatalf("create test system category: %v", err)
	}
	return categoryID
}
