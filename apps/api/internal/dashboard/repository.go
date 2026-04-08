package dashboard

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

func (r *Repository) SummaryForRange(ctx context.Context, userID, startDate, endDate string) (*Summary, error) {
	const q = `
		SELECT
			COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount_cents ELSE 0 END), 0) AS income_cents,
			COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount_cents  ELSE 0 END), 0) AS expense_cents,
			COALESCE(SUM(CASE WHEN transaction_type = 'saved_rollover' THEN amount_cents ELSE 0 END), 0) AS saved_cents
		FROM transactions
		WHERE user_id = $1
			AND deleted_at IS NULL
			AND transaction_date BETWEEN $2::date AND $3::date
	`

	var income, expense, saved int64
	err := r.db.Pool.QueryRow(ctx, q, userID, startDate, endDate).Scan(&income, &expense, &saved)
	if err != nil {
		return nil, err
	}

	return &Summary{
		PeriodStart:     startDate,
		PeriodEnd:       endDate,
		IncomeCents:     income,
		ExpenseCents:    expense,
		SavedCents:      saved,
		NetCents:        income - expense,
		RemainingBudget: income - expense,
	}, nil
}
