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
	CategoryID                 string
	CategoryName               string
	CategoryColor              string
	CurrentBudgetCents         int64
	CurrentBudgetCadence       *string
	RecentSpentCents           int64
	VariableSpentCents         int64
	RecurringSpentCents        int64
	OutlierAdjustedSpentCents  int64
	TransactionCount           int64
	PositiveSpendDays          int64
	MaxDailySpendCents         int64
	ActiveRecurringYearlyCents int64
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
		), recent_tx AS (
			SELECT
				t.category_id,
				t.amount_cents,
				t.transaction_date,
				t.source
			FROM transactions t
			INNER JOIN categories c ON c.id = t.category_id
			WHERE t.user_id = $1
			  AND t.deleted_at IS NULL
			  AND t.transaction_type = 'expense'
			  AND c.counts_toward_budget = TRUE
			  AND t.transaction_date BETWEEN $2::date AND $3::date
		), recent_spend AS (
			SELECT
				t.category_id,
				COALESCE(SUM(t.amount_cents), 0) AS recent_spent_cents,
				COALESCE(SUM(CASE WHEN t.source = 'recurring' THEN t.amount_cents ELSE 0 END), 0) AS recurring_spent_cents,
				COALESCE(SUM(CASE WHEN t.source <> 'recurring' THEN t.amount_cents ELSE 0 END), 0) AS variable_spent_cents,
				COUNT(*)::bigint AS transaction_count
			FROM recent_tx t
			GROUP BY t.category_id
		), daily_spend AS (
			SELECT
				c.id AS category_id,
				d.day::date AS spend_date,
				COALESCE(SUM(t.amount_cents), 0) AS daily_spent_cents
			FROM categories c
			CROSS JOIN generate_series($2::date, $3::date, INTERVAL '1 day') AS d(day)
			LEFT JOIN recent_tx t ON t.category_id = c.id AND t.transaction_date = d.day::date
			WHERE c.user_id = $1
			  AND c.archived_at IS NULL
			  AND c.counts_toward_budget = TRUE
			GROUP BY c.id, d.day
		), daily_stats AS (
			SELECT
				category_id,
				AVG(daily_spent_cents)::numeric AS avg_daily_cents,
				STDDEV_POP(daily_spent_cents)::numeric AS stddev_daily_cents,
				MAX(daily_spent_cents) AS max_daily_spend_cents,
				COUNT(*) FILTER (WHERE daily_spent_cents > 0)::bigint AS positive_spend_days
			FROM daily_spend
			GROUP BY category_id
		), outlier_adjusted AS (
			SELECT
				ds.category_id,
				COALESCE(SUM(ds.daily_spent_cents), 0) AS outlier_adjusted_spent_cents
			FROM daily_spend ds
			INNER JOIN daily_stats st ON st.category_id = ds.category_id
			WHERE ds.daily_spent_cents <= st.avg_daily_cents + (2 * COALESCE(st.stddev_daily_cents, 0))
			   OR ds.daily_spent_cents = 0
			GROUP BY ds.category_id
		), active_recurring AS (
			SELECT
				rr.category_id,
				COALESCE(SUM(
					CASE rr.frequency
					WHEN 'weekly' THEN rr.amount_cents * 52
					WHEN 'biweekly' THEN rr.amount_cents * 26
					WHEN 'monthly' THEN rr.amount_cents * 12
					WHEN 'yearly' THEN rr.amount_cents
					ELSE 0
					END
				), 0) AS active_recurring_yearly_cents
			FROM recurring_rules rr
			INNER JOIN categories c ON c.id = rr.category_id
			WHERE rr.user_id = $1
			  AND rr.rule_type = 'expense'
			  AND rr.active = TRUE
			  AND rr.start_date <= $3::date
			  AND (rr.end_date IS NULL OR rr.end_date >= $3::date)
			  AND c.counts_toward_budget = TRUE
			  AND c.archived_at IS NULL
			GROUP BY rr.category_id
		)
		SELECT
			c.id,
			c.name,
			c.color,
			COALESCE(ab.amount_cents, 0) AS current_budget_cents,
			ab.cadence,
			COALESCE(rs.recent_spent_cents, 0) AS recent_spent_cents,
			COALESCE(rs.variable_spent_cents, 0) AS variable_spent_cents,
			COALESCE(rs.recurring_spent_cents, 0) AS recurring_spent_cents,
			COALESCE(oa.outlier_adjusted_spent_cents, 0) AS outlier_adjusted_spent_cents,
			COALESCE(rs.transaction_count, 0) AS transaction_count,
			COALESCE(st.positive_spend_days, 0) AS positive_spend_days,
			COALESCE(st.max_daily_spend_cents, 0) AS max_daily_spend_cents,
			COALESCE(ar.active_recurring_yearly_cents, 0) AS active_recurring_yearly_cents
		FROM categories c
		LEFT JOIN active_budget ab ON ab.category_id = c.id
		LEFT JOIN recent_spend rs ON rs.category_id = c.id
		LEFT JOIN daily_stats st ON st.category_id = c.id
		LEFT JOIN outlier_adjusted oa ON oa.category_id = c.id
		LEFT JOIN active_recurring ar ON ar.category_id = c.id
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
			&row.VariableSpentCents,
			&row.RecurringSpentCents,
			&row.OutlierAdjustedSpentCents,
			&row.TransactionCount,
			&row.PositiveSpendDays,
			&row.MaxDailySpendCents,
			&row.ActiveRecurringYearlyCents,
		); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}
