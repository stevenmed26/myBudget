package onboarding

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

func (r *Repository) IsCompleted(ctx context.Context, userID string) (bool, error) {
	const q = `
		SELECT onboarding_completed_at IS NOT NULL
		FROM budget_profiles
		WHERE user_id = $1
		LIMIT 1
	`

	var completed bool
	err : r.db.Pool.QueryRow(ctx, q, userID).Scan(&completed)
	if err != nil {
		return false, err
	}
	return completed, nil
}

func (r *Repository) Submit(ctx context.Context, userID string, req SubmitRequest, effectiveFrom string) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	const updateProfile = `
		UPDATE budget_profiles
		SET
			tracking_cadence = $2,
			week_starts_on = $3,
			monthly_anchor_day = $4,
			income_amount_cents = $5,
			income_cadence = $6,
			location_code = $7,
			estimated_tax_rate_bps = $8,
			updated_at = NOW(),
			onboarding_completed_at = NOW()
		WHERE user_id = $1
	`

	if _, err := tx.Exec(ctx, updateProfile,
		userID,
		req.TrackingCadence,
		req.WeekStartsOn,
		req.MonthlyAnchorDay,
		req.IncomeAmountCents,
		req.IncomeCadence,
		req.LocationCode,
		req.EstimatedTaxRateBps,
	); err != nil {
		return err
	}

	const closeOldProfileVersion = `
		UPDATE budget_profile_versions
		SET effective_to = ($2::date - INTERVAL '1 day')::date
		WHERE user_id = $1
			AND effective_to IS NULL
	`

	if _, err := tx.Exec(ctx, closeOldProfileVersion, userID, effectiveFrom); err != nil {
		return err
	}

	const insertProfileVersion = `
		INSERT INTO budget_profile_versions (
		user_id, tracking_cadence, week_starts_on, monthly_anchor_day,
		income_amount_cents, income_cadence, location_code, estimated_tax_rate_bps,
		effective_from)
		SELECT
			user_id, $2, $3, $4, currency_code, locale, timezone, $5, $6, $7, $8, $9::date
		FROM budget_profiles
		WHERE user_id = $1
	`

	if _, err := tx.Exec(ctx, insertProfileVersion,
		userID,
		req.TrackingCadence,
		req.WeekStartsOn,
		req.MonthlyAnchorDay,
		req.IncomeAmountCents,
		req.IncomeCadence,
		req.LocationCode,
		req.EstimatedTaxRateBps,
		effectiveFrom,
	); err != nil {
		return err
	}

	for _, item := range req.CategoryBudgets {
		const categoryQ = `
			SELECT id
			FROM categories
			WHERE user_id = $1
				AND name = $2
				AND archived_at IS NULL
			LIMIT 1
		`

		var categoryID string
		if err := tx.QueryRow(ctx, categoryQ, userID, item.CategoryName).Scan(&categoryID); err != nil {
			return err
		}

		const insertBudget = `
			INSERT INTO category_budgets (category_id, amount_cents, cadence, effective_from)
			VALUES ($1, $2, $3, $4::date)
		`
		if _, err := tx.Exec(ctx, insertBudget,
			categoryID,
			item.AmountCents,
			item.Cadence,
			effectiveFrom,
		); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}