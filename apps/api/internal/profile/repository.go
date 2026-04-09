package profile

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

func (r *Repository) GetByUser(ctx context.Context, userID string) (*BudgetProfile, error) {
	const q = `
	    SELECT
		    user_id, tracking_cadence, week_starts_on, monthly_anchor_day,
			currency_code, locale, timezone,
			income_amount_cents, income_cadence, location_code, estimated_tax_rate_bps,
			created_at, updated_at
		FROM budget_profiles
		WHERE user_id = $1
    `

	var p BudgetProfile
	err := r.db.Pool.QueryRow(ctx, q, userID).Scan(
		&p.UserID,
		&p.TrackingCadence,
		&p.WeekStartsOn,
		&p.MonthlyAnchorDay,
		&p.CurrencyCode,
		&p.Locale,
		&p.Timezone,
		&p.IncomeAmountCents,
		&p.IncomeCadence,
		&p.LocationCode,
		&p.EstimatedTaxRateBps,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) UpdateByUser(ctx context.Context, userID string, req UpdateBudgetProfileRequest) (*BudgetProfile, error) {
	const q = `
	    UPDATE budgt_profiles
		SET
		    tracking_cadence = $2,
			week_starts_on = $3,
			monthly_anchor_day = $4,
			currency_code = $5,
			locale = $6,
			timezone = $7,
			income_amount_cents = $8,
			income_cadence = $9,
			location_code = $10,
			estimated_tax_rate_bps = $11,
			updated_at = NOW()
		WHERE user_id = $1
		RETURNING
		    user_id, tracking_cadence, week_starts_on, monthly_anchor_day,
			currency_code, locale, timezone,
			income_amount_cents, income_cadence, location_code, estimated_tax_rate_bps,
			created_at, updated_at
	`

	var p BudgetProfile
	err := r.db.Pool.QueryRow(ctx, q,
		userID,
		req.TrackingCadence,
		req.WeekStartsOn,
		req.MonthlyAnchorDay,
		req.CurrencyCode,
		req.Locale,
		req.Timezone,
		req.IncomeAmountCents,
		req.IncomeCadence,
		req.LocationCode,
		req.EstimatedTaxRateBps,
	).Scan(
		&p.UserID,
		&p.TrackingCadence,
		&p.WeekStartsOn,
		&p.MonthlyAnchorDay,
		&p.CurrencyCode,
		&p.Locale,
		&p.Timezone,
		&p.IncomeAmountCents,
		&p.IncomeCadence,
		&p.LocationCode,
		&p.EstimatedTaxRateBps,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}
