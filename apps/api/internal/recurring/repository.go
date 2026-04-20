package recurring

import (
	"context"
	"errors"
	"fmt"
	"time"

	"mybudget-api/internal/db"

	"github.com/jackc/pgx/v5"
)

var ErrRuleNotFound = errors.New("recurring rule not found")

type Repository struct {
	db *db.DB
}

func NewRepository(db *db.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListByUser(ctx context.Context, userID string) ([]Rule, error) {
	const q = `
		SELECT
			id, user_id, category_id, name, amount_cents, rule_type,
			frequency, start_date::text, end_date::text, next_run_date::text,
			active, created_at, updated_at
		FROM recurring_rules
		WHERE user_id = $1
		ORDER BY active DESC, next_run_date ASC, created_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Rule, 0)
	for rows.Next() {
		var item Rule
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.CategoryID,
			&item.Name,
			&item.AmountCents,
			&item.RuleType,
			&item.Frequency,
			&item.StartDate,
			&item.EndDate,
			&item.NextRunDate,
			&item.Active,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}

	return out, rows.Err()
}

func (r *Repository) Create(ctx context.Context, userID string, req CreateRuleRequest) (*Rule, error) {
	const q = `
		INSERT INTO recurring_rules (
			user_id, category_id, name, amount_cents, rule_type,
			frequency, start_date, end_date, next_run_date, active
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $7::date, TRUE)
		RETURNING
			id, user_id, category_id, name, amount_cents, rule_type,
			frequency, start_date::text, end_date::text, next_run_date::text,
			active, created_at, updated_at
	`

	var item Rule
	err := r.db.Pool.QueryRow(
		ctx,
		q,
		userID,
		req.CategoryID,
		req.Name,
		req.AmountCents,
		req.RuleType,
		req.Frequency,
		req.StartDate,
		req.EndDate,
	).Scan(
		&item.ID,
		&item.UserID,
		&item.CategoryID,
		&item.Name,
		&item.AmountCents,
		&item.RuleType,
		&item.Frequency,
		&item.StartDate,
		&item.EndDate,
		&item.NextRunDate,
		&item.Active,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &item, nil
}

func (r *Repository) Update(ctx context.Context, userID, ruleID string, req UpdateRuleRequest) (*Rule, error) {
	const q = `
		UPDATE recurring_rules
		SET category_id = $3,
			name = $4,
			amount_cents = $5,
			rule_type = $6,
			frequency = $7,
			start_date = $8::date,
			end_date = $9::date,
			next_run_date = GREATEST(next_run_date, $8::date),
			active = $10,
			updated_at = NOW()
		WHERE id = $1
		  AND user_id = $2
		RETURNING
			id, user_id, category_id, name, amount_cents, rule_type,
			frequency, start_date::text, end_date::text, next_run_date::text,
			active, created_at, updated_at
	`

	var item Rule
	err := r.db.Pool.QueryRow(
		ctx,
		q,
		ruleID,
		userID,
		req.CategoryID,
		req.Name,
		req.AmountCents,
		req.RuleType,
		req.Frequency,
		req.StartDate,
		req.EndDate,
		req.Active,
	).Scan(
		&item.ID,
		&item.UserID,
		&item.CategoryID,
		&item.Name,
		&item.AmountCents,
		&item.RuleType,
		&item.Frequency,
		&item.StartDate,
		&item.EndDate,
		&item.NextRunDate,
		&item.Active,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrRuleNotFound
		}
		return nil, err
	}

	return &item, nil
}

func (r *Repository) SoftDelete(ctx context.Context, userID, ruleID string) error {
	const q = `
		UPDATE recurring_rules
		SET updated_at = NOW(), active = FALSE
		WHERE id = $1
		  AND user_id = $2
	`

	cmd, err := r.db.Pool.Exec(ctx, q, ruleID, userID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrRuleNotFound
	}
	return nil
}

type dueRule struct {
	ID          string
	CategoryID  string
	Name        string
	AmountCents int64
	RuleType    string
	Frequency   string
	StartDate   string
	EndDate     *string
	NextRunDate string
	Active      bool
}

func (r *Repository) ListDueRules(ctx context.Context, userID, throughDate string) ([]dueRule, error) {
	const q = `
		SELECT id, category_id, name, amount_cents, rule_type, frequency,
		       start_date::text, end_date::text, next_run_date::text, active
		FROM recurring_rules
		WHERE user_id = $1
		  AND active = TRUE
		  AND next_run_date <= $2::date
		ORDER BY next_run_date ASC, created_at ASC
	`

	rows, err := r.db.Pool.Query(ctx, q, userID, throughDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]dueRule, 0)
	for rows.Next() {
		var item dueRule
		if err := rows.Scan(
			&item.ID,
			&item.CategoryID,
			&item.Name,
			&item.AmountCents,
			&item.RuleType,
			&item.Frequency,
			&item.StartDate,
			&item.EndDate,
			&item.NextRunDate,
			&item.Active,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) ApplyDueRule(ctx context.Context, userID string, ruleID string, throughDate string) (created int, advanced bool, err error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return 0, false, err
	}
	defer tx.Rollback(ctx)

	const selectQ = `
		SELECT id, category_id, name, amount_cents, rule_type, frequency,
		       start_date::text, end_date::text, next_run_date::text, active
		FROM recurring_rules
		WHERE id = $1
		  AND user_id = $2
		FOR UPDATE
	`

	var rule dueRule
	if err := tx.QueryRow(ctx, selectQ, ruleID, userID).Scan(
		&rule.ID,
		&rule.CategoryID,
		&rule.Name,
		&rule.AmountCents,
		&rule.RuleType,
		&rule.Frequency,
		&rule.StartDate,
		&rule.EndDate,
		&rule.NextRunDate,
		&rule.Active,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, false, ErrRuleNotFound
		}
		return 0, false, err
	}

	if !rule.Active || rule.NextRunDate > throughDate {
		if err := tx.Commit(ctx); err != nil {
			return 0, false, err
		}
		return 0, false, nil
	}

	currentRun := rule.NextRunDate
	for currentRun <= throughDate {
		if rule.EndDate != nil && *rule.EndDate != "" && currentRun > *rule.EndDate {
			break
		}

		transactionType := transactionTypeForRule(rule.RuleType)
		note := buildRecurringNote(rule.Name, currentRun)

		const insertQ = `
			INSERT INTO transactions (
				user_id, category_id, amount_cents, transaction_type,
				transaction_date, note, source
			)
			VALUES ($1, $2, $3, $4, $5::date, $6, 'recurring')
		`
		if _, err := tx.Exec(ctx, insertQ, userID, rule.CategoryID, rule.AmountCents, transactionType, currentRun, note); err != nil {
			return 0, false, err
		}
		created++

		nextRun, err := advanceDate(currentRun, rule.Frequency)
		if err != nil {
			return 0, false, err
		}
		currentRun = nextRun
		advanced = true
	}

	const updateQ = `
		UPDATE recurring_rules
		SET next_run_date = $3::date,
			updated_at = NOW(),
			active = CASE
				WHEN end_date IS NOT NULL AND $3::date > end_date THEN FALSE
				ELSE active
			END
		WHERE id = $1
		  AND user_id = $2
	`
	if _, err := tx.Exec(ctx, updateQ, rule.ID, userID, currentRun); err != nil {
		return 0, false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, false, err
	}

	return created, advanced, nil
}

func advanceDate(currentDate, frequency string) (string, error) {
	current, err := time.Parse("2006-01-02", currentDate)
	if err != nil {
		return "", err
	}

	switch frequency {
	case "weekly":
		current = current.AddDate(0, 0, 7)
	case "biweekly":
		current = current.AddDate(0, 0, 14)
	case "monthly":
		current = current.AddDate(0, 1, 0)
	case "yearly":
		current = current.AddDate(1, 0, 0)
	default:
		return "", errors.New("invalid recurring frequency")
	}

	return current.Format("2006-01-02"), nil
}

func transactionTypeForRule(ruleType string) string {
	switch ruleType {
	case "income":
		return "income"
	default:
		return "expense"
	}
}

func buildRecurringNote(name, runDate string) string {
	return fmt.Sprintf("Recurring: %s (%s)", name, runDate)
}
