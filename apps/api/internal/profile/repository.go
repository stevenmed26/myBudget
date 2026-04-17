package profile

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

func (r *Repository) GetCurrentByUser(ctx context.Context, userID string) (*BudgetProfile, error) {
	const q = `
		SELECT
			user_id,
			tracking_cadence,
			week_starts_on,
			monthly_anchor_day,
			currency_code,
			locale,
			timezone,
			income_amount_cents,
			income_cadence,
			location_code,
			estimated_tax_rate_bps,
			created_at,
			created_at AS updated_at
		FROM budget_profile_versions
		WHERE user_id = $1
		  AND effective_to IS NULL
		ORDER BY effective_from DESC, created_at DESC
		LIMIT 1
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
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &p, nil
}

func (r *Repository) GetVersionForDate(ctx context.Context, userID string, onDate string) (*BudgetProfile, error) {
	const q = `
		SELECT
			user_id,
			tracking_cadence,
			week_starts_on,
			monthly_anchor_day,
			currency_code,
			locale,
			timezone,
			income_amount_cents,
			income_cadence,
			location_code,
			estimated_tax_rate_bps,
			created_at,
			created_at AS updated_at
		FROM budget_profile_versions
		WHERE user_id = $1
		  AND effective_from <= $2::date
		  AND (effective_to IS NULL OR effective_to >= $2::date)
		ORDER BY effective_from DESC, created_at DESC
		LIMIT 1
	`

	var p BudgetProfile
	err := r.db.Pool.QueryRow(ctx, q, userID, onDate).Scan(
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
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &p, nil
}

func (r *Repository) InsertNewVersion(ctx context.Context, userID string, req UpdateBudgetProfileRequest, effectiveFrom string) (*BudgetProfile, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	const closeOld = `
		UPDATE budget_profile_versions
		SET effective_to = ($2::date - INTERVAL '1 day')::date
		WHERE user_id = $1
		  AND effective_to IS NULL
	`
	if _, err := tx.Exec(ctx, closeOld, userID, effectiveFrom); err != nil {
		return nil, err
	}

	const insertNew = `
		INSERT INTO budget_profile_versions (
			user_id,
			tracking_cadence,
			week_starts_on,
			monthly_anchor_day,
			currency_code,
			locale,
			timezone,
			income_amount_cents,
			income_cadence,
			location_code,
			estimated_tax_rate_bps,
			effective_from
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::date)
		RETURNING
			user_id,
			tracking_cadence,
			week_starts_on,
			monthly_anchor_day,
			currency_code,
			locale,
			timezone,
			income_amount_cents,
			income_cadence,
			location_code,
			estimated_tax_rate_bps,
			created_at,
			created_at AS updated_at
	`

	var p BudgetProfile
	err = tx.QueryRow(ctx, insertNew,
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
		effectiveFrom,
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

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &p, nil
}
