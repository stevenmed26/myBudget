package taxes

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type ProfileInput struct {
	TrackingCadence   string
	IncomeAmountCents int64
	IncomeCadence     string
	LocationCode      string
}

type queryer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func EstimateForProfile(input ProfileInput) Estimate {
	annualIncome := AnnualizeIncome(input.IncomeAmountCents, input.IncomeCadence)
	return EstimateForAnnualIncome(annualIncome, input.LocationCode)
}

func SyncRecurringRules(ctx context.Context, q queryer, userID string, input ProfileInput, startDate string) (Estimate, error) {
	estimate := EstimateForProfile(input)
	categoryID, err := ensureTaxCategory(ctx, q, userID)
	if err != nil {
		return estimate, err
	}

	items := []struct {
		name        string
		annualCents int64
	}{
		{name: "Federal income tax estimate", annualCents: estimate.FederalIncomeCents},
		{name: "State income tax estimate", annualCents: estimate.StateIncomeCents},
		{name: "Social Security estimate", annualCents: estimate.SocialSecurityCents},
		{name: "Medicare estimate", annualCents: estimate.MedicareCents},
	}

	frequency := RecurringFrequency(input.TrackingCadence)
	for _, item := range items {
		amount := PeriodAmountCents(item.annualCents, input.TrackingCadence)
		if amount <= 0 {
			if err := deactivateRule(ctx, q, userID, item.name); err != nil {
				return estimate, err
			}
			continue
		}
		if err := upsertRule(ctx, q, userID, categoryID, item.name, amount, frequency, startDate); err != nil {
			return estimate, err
		}
	}

	return estimate, nil
}

func ensureTaxCategory(ctx context.Context, q queryer, userID string) (string, error) {
	const selectQ = `
		SELECT id
		FROM categories
		WHERE user_id = $1
		  AND LOWER(name) = 'tax'
		  AND archived_at IS NULL
		LIMIT 1
	`
	var categoryID string
	err := q.QueryRow(ctx, selectQ, userID).Scan(&categoryID)
	if err == nil {
		return categoryID, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}

	const insertQ = `
		INSERT INTO categories (user_id, name, color, is_default, counts_toward_budget, is_system)
		VALUES ($1, 'Tax', '#EF4444', TRUE, TRUE, TRUE)
		RETURNING id
	`
	err = q.QueryRow(ctx, insertQ, userID).Scan(&categoryID)
	return categoryID, err
}

func upsertRule(ctx context.Context, q queryer, userID, categoryID, name string, amountCents int64, frequency, startDate string) error {
	const updateQ = `
		UPDATE recurring_rules
		SET category_id = $3,
			amount_cents = $4,
			rule_type = 'expense',
			frequency = $5,
			start_date = $6::date,
			next_run_date = GREATEST(next_run_date, $6::date),
			end_date = NULL,
			active = TRUE,
			updated_at = NOW()
		WHERE user_id = $1
		  AND name = $2
	`
	cmd, err := q.Exec(ctx, updateQ, userID, name, categoryID, amountCents, frequency, startDate)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() > 0 {
		return nil
	}

	const insertQ = `
		INSERT INTO recurring_rules (
			user_id, category_id, name, amount_cents, rule_type,
			frequency, start_date, next_run_date, active
		)
		VALUES ($1, $2, $3, $4, 'expense', $5, $6::date, $6::date, TRUE)
	`
	_, err = q.Exec(ctx, insertQ, userID, categoryID, name, amountCents, frequency, startDate)
	return err
}

func deactivateRule(ctx context.Context, q queryer, userID, name string) error {
	const updateQ = `
		UPDATE recurring_rules
		SET active = FALSE, updated_at = NOW()
		WHERE user_id = $1
		  AND name = $2
		  AND active = TRUE
	`
	_, err := q.Exec(ctx, updateQ, userID, name)
	return err
}
