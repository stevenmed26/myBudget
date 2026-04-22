package recommendations

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

type categoryHistoryRow struct {
	CategoryID           string
	CategoryName         string
	CategoryColor        string
	CurrentBudgetCents   int64
	CurrentBudgetCadence *string
	RecentSpentCents     int64
	TransactionCount     int64
}

func (r *Repository) GetCategoryHistoryRows(ctx context.Context, userID, startDate, endDate string) ([]categoryHistoryRow, error) {
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
			  AND (cb.effective_to IS NULL OR cb.effective_to >= $3::date)
			ORDER BY cb.category_id, cb.effective_from DESC
		), recent_spend AS (
			SELECT
				t.category_id,
				COALESCE(SUM(t.amount_cents), 0) AS recent_spent_cents,
				COUNT(*)::bigint AS transaction_count
			FROM transactions t
			INNER JOIN categories c ON c.id = t.category_id
			WHERE t.user_id = $1
			  AND t.deleted_at IS NULL
			  AND t.transaction_type = 'expense'
			  AND c.counts_toward_budget = TRUE
			  AND t.transaction_date BETWEEN $2::date AND $3::date
			GROUP BY t.category_id
		)
		SELECT
			c.id,
			c.name,
			c.color,
			COALESCE(ab.amount_cents, 0) AS current_budget_cents,
			ab.cadence,
			COALESCE(rs.recent_spent_cents, 0) AS recent_spent_cents,
			COALESCE(rs.transaction_count, 0) AS transaction_count
		FROM categories c
		LEFT JOIN active_budget ab ON ab.category_id = c.id
		LEFT JOIN recent_spend rs ON rs.category_id = c.id
		WHERE c.user_id = $1
		  AND c.archived_at IS NULL
		  AND c.counts_toward_budget = TRUE
		ORDER BY c.name ASC
	`

	rows, err := r.db.Pool.Query(ctx, q, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]categoryHistoryRow, 0)
	for rows.Next() {
		var row categoryHistoryRow
		if err := rows.Scan(
			&row.CategoryID,
			&row.CategoryName,
			&row.CategoryColor,
			&row.CurrentBudgetCents,
			&row.CurrentBudgetCadence,
			&row.RecentSpentCents,
			&row.TransactionCount,
		); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}
