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

const withholdingCategoryName = "Withholding"

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
		oldName     string
		annualCents int64
	}{
		{name: "Federal income tax withholding", oldName: "Federal income tax estimate", annualCents: estimate.FederalIncomeCents},
		{name: "State income tax withholding", oldName: "State income tax estimate", annualCents: estimate.StateIncomeCents},
		{name: "Social Security withholding", oldName: "Social Security estimate", annualCents: estimate.SocialSecurityCents},
		{name: "Medicare withholding", oldName: "Medicare estimate", annualCents: estimate.MedicareCents},
	}

	frequency := RecurringFrequency(input.TrackingCadence)
	if err := syncWithholdingBudget(ctx, q, categoryID, PeriodAmountCents(estimate.TotalCents, input.TrackingCadence), frequency, startDate); err != nil {
		return estimate, err
	}

	for _, item := range items {
		amount := PeriodAmountCents(item.annualCents, input.TrackingCadence)
		if amount <= 0 {
			if err := deactivateRule(ctx, q, userID, item.name, item.oldName); err != nil {
				return estimate, err
			}
			continue
		}
		if err := upsertRule(ctx, q, userID, categoryID, item.name, item.oldName, amount, frequency, startDate); err != nil {
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
		  AND LOWER(name) IN ('withholding', 'tax')
		  AND archived_at IS NULL
		ORDER BY CASE WHEN LOWER(name) = 'withholding' THEN 0 ELSE 1 END
		LIMIT 1
	`
	var categoryID string
	err := q.QueryRow(ctx, selectQ, userID).Scan(&categoryID)
	if err == nil {
		if err := renameTaxCategory(ctx, q, userID, categoryID); err != nil {
			return "", err
		}
		return categoryID, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}

	const insertQ = `
		INSERT INTO categories (user_id, name, color, is_default, counts_toward_budget, is_system)
		VALUES ($1, 'Withholding', '#EF4444', TRUE, TRUE, TRUE)
		RETURNING id
	`
	err = q.QueryRow(ctx, insertQ, userID).Scan(&categoryID)
	return categoryID, err
}

func renameTaxCategory(ctx context.Context, q queryer, userID, categoryID string) error {
	const updateQ = `
		UPDATE categories
		SET name = $3, updated_at = NOW()
		WHERE id = $1
		  AND user_id = $2
		  AND LOWER(name) = 'tax'
		  AND archived_at IS NULL
		  AND NOT EXISTS (
			SELECT 1
			FROM categories existing
			WHERE existing.user_id = $2
			  AND LOWER(existing.name) = LOWER($3)
			  AND existing.archived_at IS NULL
		  )
	`
	_, err := q.Exec(ctx, updateQ, categoryID, userID, withholdingCategoryName)
	return err
}

func syncWithholdingBudget(ctx context.Context, q queryer, categoryID string, amountCents int64, cadence, effectiveFrom string) error {
	const closeOld = `
		UPDATE category_budgets
		SET effective_to = ($2::date - INTERVAL '1 day')::date
		WHERE category_id = $1
		  AND effective_to IS NULL
		  AND (amount_cents <> $3 OR cadence <> $4)
	`
	if _, err := q.Exec(ctx, closeOld, categoryID, effectiveFrom, amountCents, cadence); err != nil {
		return err
	}

	const insertNew = `
		INSERT INTO category_budgets (category_id, amount_cents, cadence, effective_from)
		SELECT $1, $2, $3, $4::date
		WHERE NOT EXISTS (
			SELECT 1
			FROM category_budgets
			WHERE category_id = $1
			  AND effective_to IS NULL
			  AND amount_cents = $2
			  AND cadence = $3
		)
	`
	_, err := q.Exec(ctx, insertNew, categoryID, amountCents, cadence, effectiveFrom)
	return err
}

func upsertRule(ctx context.Context, q queryer, userID, categoryID, name, oldName string, amountCents int64, frequency, startDate string) error {
	const updateQ = `
		UPDATE recurring_rules
		SET category_id = $3,
			name = $4,
			amount_cents = $5,
			rule_type = 'expense',
			frequency = $6,
			start_date = $7::date,
			next_run_date = GREATEST(next_run_date, $7::date),
			end_date = NULL,
			active = TRUE,
			updated_at = NOW()
		WHERE user_id = $1
		  AND name IN ($2, $8)
	`
	cmd, err := q.Exec(ctx, updateQ, userID, name, categoryID, name, amountCents, frequency, startDate, oldName)
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

func deactivateRule(ctx context.Context, q queryer, userID, name, oldName string) error {
	const updateQ = `
		UPDATE recurring_rules
		SET name = $2, active = FALSE, updated_at = NOW()
		WHERE user_id = $1
		  AND name IN ($2, $3)
		  AND active = TRUE
	`
	_, err := q.Exec(ctx, updateQ, userID, name, oldName)
	return err
}
