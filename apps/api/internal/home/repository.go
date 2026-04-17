package home

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"mybudget-api/internal/db"
)

type Repository struct {
	db *db.DB
}

func NewRepository(db *db.DB) *Repository {
	return &Repository{db: db}
}

type profileRow struct {
	TrackingCadence     string
	WeekStartsOn        int
	MonthlyAnchorDay    int
	IncomeAmountCents   int64
	IncomeCadence       string
	EstimatedTaxRateBps int
}

func (r *Repository) GetProfileInputs(ctx context.Context, userID string) (*profileRow, error) {
	const q = `
	    SELECT
		    tracking_cadence, week_starts_on, monthly_anchor_day,
			income_amount_cents, income_cadence, estimated_tax_rate_bps
	    FROM budget_profiles
		WHERE user_id = $1
	`

	var row profileRow
	err := r.db.Pool.QueryRow(ctx, q, userID).Scan(
		&row.TrackingCadence,
		&row.WeekStartsOn,
		&row.MonthlyAnchorDay,
		&row.IncomeAmountCents,
		&row.IncomeCadence,
		&row.EstimatedTaxRateBps,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &row, nil
}

type categorySpendRow struct {
	CategoryID         string
	CategoryName       string
	CategoryColor      string
	CountsTowardBudget bool
	BudgetAmountCents  int64
	BudgetCadence      *string
	SpentAmountCents   int64
}

func (r *Repository) GetCategorySpendRows(ctx context.Context, userID, startDate, endDate string) ([]categorySpendRow, error) {
	const q = `
	    WITH active_budget AS (
		    SELECT DISTINCT ON (cb.category_id)
			cb.category_id,
			cb.amount_cents,
			cb.cadence
		FROM category_budgets cb
		INNER JOIN categories c ON c.id = cb.category_id
		WHERE c.user_id = $1
		    AND cb.effective_from <= $3::date
			AND (cb.effective_to IS NULL OR cb.effective_to >= $2::date)
		ORDER BY cb.category_id, cb.effective_from DESC
		),
		SPEND AS (
			SELECT
				t.category_id,
				COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount_cents ELSE 0 END), 0) AS spent_amount_cents
			FROM transactions t
			WHERE t.user_id = $1
				AND t.deleted_at IS NULL
				AND t.transaction_date BETWEEN $2::date AND $3::date
			GROUP BY t.category_id
		)
		SELECT
		    c.id,
			c.name,
			c.color,
			c.counts_toward_budget,
			COALESCE(ab.amount_cents, 0) AS budget_amount_cents,
			ab.cadence,
			COALESCE(s.spent_amount_cents, 0) AS spent_amount_cents
		FROM categories c
		LEFT JOIN active_budget ab ON ab.category_id = c.id
		LEFT JOIN spend s ON s.category_id = c.id
		WHERE c.user_id = $1
		    AND c.archived_at IS NULL
		ORDER BY c.is_system ASC, c.name ASC
	`

	rows, err := r.db.Pool.Query(ctx, q, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]categorySpendRow, 0)
	for rows.Next() {
		var row categorySpendRow
		if err := rows.Scan(
			&row.CategoryID,
			&row.CategoryName,
			&row.CategoryColor,
			&row.CountsTowardBudget,
			&row.BudgetAmountCents,
			&row.BudgetCadence,
			&row.SpentAmountCents,
		); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}
