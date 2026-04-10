package categorybudgets

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

func (r *Repository) ListActiveByUser(ctx context.Context, userID string, onDate string) ([]CategoryBudget, error) {
	const q = `
	    SELECT
		    cb.id,
			cb.category_id,
			c.name,
			c.color,
			cb.amount_cents,
			cb.cadence,
			cb.effective_from::text,
			cb.effective_to::text,
			cb.created_at,
		FROM category_budgets cb
		INNER JOIN categories c ON c.id = cb.category_id
		WHERE c.user_id = $1
		    AND c.archived_at IS NULL
			AND cb.effective_from <= $2::date
			AND (cb.effective_to IS NULL OR cb.effective_to >= $2::date)
		ORDER BY c.name ADC, cb.effective_from DESC
	`

	rows, err := r.db.Pool.Query(ctx, q, userID, onDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []CategoryBudget
	for rows.Next() {
		var item CategoryBudget
		if err := rows.Scan(
			&item.ID,
			&item.CategoryID,
			&item.CategoryName,
			&item.CategoryColor,
			&item.AmountCents,
			&item.Cadence,
			&item.EffectiveFrom,
			&item.EffectiveTo,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}

	return out, rows.Err()
}

func (r *Repository) UpsertNewVersion(ctx context.Context, req UpsertCategoryBudgetRequest) (*CategoryBudget, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	const closeOld = `
	    UPDATE category_budgets cb
		SET effective_to = ($2::date - INTERVAL '1 day')::date
		WHERE category_id = $1
		    AND effective_to IS NULL
	`

	if _, err := tx.Exec(ctx, closeOld, req.CategoryID, req.EffectiveFrom); err != nil {
		return nil, err
	}

	const insertNew = `
	    INSERT INTO category_budgets (category_id, amount_cents, cadence, effective_from)
		VALUES ($1, $2, $3, $4::date)
		RETURNING id, category_id, amount_cents, cadence, effective_from::text, effective_to::text, created_at
	`

	var item CategoryBudget
	if err := tx.QueryRow(ctx, insertNew,
		req.CategoryID,
		req.AmountCents,
		req.Cadence,
		req.EffectiveFrom,
	).Scan(
		&item.ID,
		&item.CategoryID,
		&item.AmountCents,
		&item.Cadence,
		&item.EffectiveFrom,
		&item.EffectiveTo,
		&item.CreatedAt,
	); err != nil {
		return nil, err
	}

	const categoryQ = `
	    SELECT name, color
		FROM categories
		WHERE id = $1
	`

	if err := tx.QueryRow(ctx, categoryQ, item.CategoryID).Scan(&item.CategoryColor, &item.CategoryName); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &item, nil
}
