package transactions

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

func (r *Repository) ListByUserAndDateRange(ctx context.Context, userID, startDate, endDate string) ([]Transaction, error) {
	const q = `
		SELECT
			id, user_id, category_id, amount_cents, transaction_type,
			transaction_date::text, merchant_name, note, source, created_at, updated_at, deleted_at
		FROM transactions
		WHERE user_id = $1
			AND deleted_at IS NULL
			AND transaction_date BETWEEN $2::date AND $3::date
		ORDER BY transaction_date DESC, created_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, q, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Transaction, 0)
	for rows.Next() {
		var t Transaction
		if err := rows.Scan(
			&t.ID,
			&t.UserID,
			&t.CategoryID,
			&t.AmountCents,
			&t.TransactionType,
			&t.TransactionDate,
			&t.MerchantName,
			&t.Note,
			&t.Source,
			&t.CreatedAt,
			&t.UpdatedAt,
			&t.DeletedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (r *Repository) Create(ctx context.Context, userID string, req CreateTransactionRequest) (*Transaction, error) {
	const q = `
		INSERT INTO transactions (
			user_id, category_id, amount_cents, transaction_type,
			transaction_date, merchant_name, note, source
		)
		VALUES ($1, $2, $3, $4, $5::date, $6, $7, 'manual')
		RETURNING
			id, user_id, category_id, amount_cents, transaction_type,
			transaction_date::text, merchant_name, note, source, created_at, updated_at, deleted_at
	`

	var t Transaction
	err := r.db.Pool.QueryRow(
		ctx,
		q,
		userID,
		req.CategoryID,
		req.AmountCents,
		req.TransactionType,
		req.TransactionDate,
		req.MerchantName,
		req.Note,
	).Scan(
		&t.ID,
		&t.UserID,
		&t.CategoryID,
		&t.AmountCents,
		&t.TransactionType,
		&t.TransactionDate,
		&t.MerchantName,
		&t.Note,
		&t.Source,
		&t.CreatedAt,
		&t.UpdatedAt,
		&t.DeletedAt,
	)
	if err != nil {
		return nil, err
	}

	return &t, nil
}

func (r *Repository) SoftDelete(ctx context.Context, userID, transactionID string) error {
	const q = `
		UPDATE transactions
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1
			AND user_id = $2
			AND deleted_at IS NULL
	`

	_, err := r.db.Pool.Exec(ctx, q, transactionID, userID)
	return err
}
