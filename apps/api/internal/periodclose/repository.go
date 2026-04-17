package periodclose

import (
	"context"
	"errors"

	"mybudget-api/internal/db"
)

type Repository struct {
	db *db.DB
}

func NewRepository(db *db.DB) *Repository {
	return &Repository{db: db}
}

type periodRow struct {
	ID                         string
	Status                     string
	StartDate                  string
	EndDate                    string
	SavedRolloverTransactionID *string
}

func (r *Repository) GetOrCreatePeriod(
	ctx context.Context,
	userID, startDate, endDate, cadence string,
) (*periodRow, error) {
	const insertQ = `
		INSERT INTO budget_periods (id, user_id, start_date, end_date, cadence, status)
		VALUES (gen_random_uuid(), $1, $2::date, $3::date, $4, 'open')
		ON CONFLICT (user_id, start_date, end_date) DO NOTHING
	`

	if _, err := r.db.Pool.Exec(ctx, insertQ, userID, startDate, endDate, cadence); err != nil {
		return nil, err
	}

	const selectQ = `
		SELECT id, status, start_date::text, end_date::text, saved_rollover_transaction_id::text
		FROM budget_periods
		WHERE user_id = $1
		  AND start_date = $2::date
		  AND end_date = $3::date
	`

	var row periodRow
	if err := r.db.Pool.QueryRow(ctx, selectQ, userID, startDate, endDate).Scan(
		&row.ID,
		&row.Status,
		&row.StartDate,
		&row.EndDate,
		&row.SavedRolloverTransactionID,
	); err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *Repository) GetSavedCategoryID(ctx context.Context, userID string) (string, error) {
	const q = `
		SELECT id
		FROM categories
		WHERE user_id = $1
		  AND name = 'Saved'
		  AND archived_at IS NULL
		LIMIT 1
	`

	var id string
	err := r.db.Pool.QueryRow(ctx, q, userID).Scan(&id)
	return id, err
}

func (r *Repository) FinalizePeriod(
	ctx context.Context,
	periodID string,
	userID string,
	savedCategoryID *string,
	leftoverAmountCents int64,
	transactionDate string,
	note string,
) (*string, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var savedTransactionID *string

	if savedCategoryID != nil && leftoverAmountCents > 0 {
		const insertTx = `
			INSERT INTO transactions (
				id, user_id, category_id, amount_cents, transaction_type,
				transaction_date, note, source
			)
			VALUES (
				gen_random_uuid(), $1, $2, $3, 'saved_rollover',
				$4::date, $5, 'system'
			)
			RETURNING id
		`

		var id string
		if err := tx.QueryRow(ctx, insertTx, userID, *savedCategoryID, leftoverAmountCents, transactionDate, note).Scan(&id); err != nil {
			return nil, err
		}
		savedTransactionID = &id
	}

	const closeQ = `
		UPDATE budget_periods
		SET
			status = 'closed',
			closed_at = NOW(),
			saved_rollover_transaction_id = $2,
			updated_at = NOW()
		WHERE id = $1
		  AND status = 'open'
	`
	cmd, err := tx.Exec(ctx, closeQ, periodID, savedTransactionID)
	if err != nil {
		return nil, err
	}
	if cmd.RowsAffected() == 0 {
		return nil, errors.New("period is already closed")
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return savedTransactionID, nil
}
