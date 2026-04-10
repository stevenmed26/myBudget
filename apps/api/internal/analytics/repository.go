package analytics

import (
	"context"

	"mybudget-api/internal/db"
)

type Repository struct {
	db *db.DB
}

func NewRepository(db *db.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetTotalSaved(ctx context.Context, userID string) (int64, error) {
	const q = `
		SELECT COALESCE(SUM(amount_cents), 0)
		FROM transactions
		WHERE user_id = $1
		  AND deleted_at IS NULL
		  AND transaction_type = 'saved_rollover'
	`
	var total int64
	err := r.db.Pool.QueryRow(ctx, q, userID).Scan(&total)
	return total, err
}

func (r *Repository) GetTotals(ctx context.Context, userID string) (income int64, expense int64, err error) {
	const q = `
		SELECT
			COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount_cents ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount_cents ELSE 0 END), 0)
		FROM transactions
		WHERE user_id = $1
		  AND deleted_at IS NULL
	`
	err = r.db.Pool.QueryRow(ctx, q, userID).Scan(&income, &expense)
	return
}

func (r *Repository) GetCategoryBreakdown(ctx context.Context, userID string) ([]AnalyticsCategorySlice, error) {
	const q = `
		SELECT
			c.id,
			c.name,
			c.color,
			COALESCE(SUM(t.amount_cents), 0) AS amount_cents
		FROM categories c
		LEFT JOIN transactions t
			ON t.category_id = c.id
		   AND t.user_id = $1
		   AND t.deleted_at IS NULL
		   AND t.transaction_type = 'expense'
		WHERE c.user_id = $1
		  AND c.archived_at IS NULL
		GROUP BY c.id, c.name, c.color
		ORDER BY amount_cents DESC, c.name ASC
	`

	rows, err := r.db.Pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []AnalyticsCategorySlice
	for rows.Next() {
		var item AnalyticsCategorySlice
		if err := rows.Scan(&item.CategoryID, &item.CategoryName, &item.Color, &item.AmountCents); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) GetMonthlyTrend(ctx context.Context, userID string) ([]AnalyticsTrendPoint, error) {
	const q = `
		SELECT
			TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') AS label,
			COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount_cents ELSE 0 END), 0) AS income_cents,
			COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense_cents
		FROM transactions
		WHERE user_id = $1
		  AND deleted_at IS NULL
		GROUP BY DATE_TRUNC('month', transaction_date)
		ORDER BY DATE_TRUNC('month', transaction_date) ASC
		LIMIT 12
	`

	rows, err := r.db.Pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []AnalyticsTrendPoint
	for rows.Next() {
		var item AnalyticsTrendPoint
		if err := rows.Scan(&item.Label, &item.IncomeCents, &item.ExpenseCents); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}
