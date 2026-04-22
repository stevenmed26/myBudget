package categories

import (
	"context"
	"errors"

	"mybudget-api/internal/db"

	"github.com/jackc/pgx/v5"
)

var ErrCategoryNotFound = errors.New("category not found")

type Repository struct {
	db *db.DB
}

func NewRepository(db *db.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListByUser(ctx context.Context, userID string) ([]Category, error) {
	const q = `
		SELECT
			id, user_id, name, color, icon, is_default,
			counts_toward_budget, is_system, created_at, updated_at, archived_at
		FROM categories
		WHERE user_id = $1 AND archived_at IS NULL
		ORDER BY is_system ASC, is_default DESC, name ASC
	`

	rows, err := r.db.Pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Category, 0)
	for rows.Next() {
		var c Category
		if err := rows.Scan(
			&c.ID,
			&c.UserID,
			&c.Name,
			&c.Color,
			&c.Icon,
			&c.IsDefault,
			&c.CountsTowardBudget,
			&c.IsSystem,
			&c.CreatedAt,
			&c.UpdatedAt,
			&c.ArchivedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, c)

	}
	return out, rows.Err()

}

func (r *Repository) Create(ctx context.Context, userID string, req CreateCategoryRequest) (*Category, error) {
	const q = `
		INSERT INTO categories (user_id, name, color, icon, is_default, counts_toward_budget, is_system
		)
		VALUES ($1, $2, $3, $4, FALSE, $5, FALSE)
		RETURNING 
			id, user_id, name, color, icon, is_default,
			counts_toward_budget, is_system, created_at, updated_at, archived_at
	`

	var c Category
	err := r.db.Pool.QueryRow(ctx, q,
		userID,
		req.Name,
		req.Color,
		req.Icon,
		req.CountsTowardBudget,
	).Scan(
		&c.ID,
		&c.UserID,
		&c.Name,
		&c.Color,
		&c.Icon,
		&c.IsDefault,
		&c.CountsTowardBudget,
		&c.IsSystem,
		&c.CreatedAt,
		&c.UpdatedAt,
		&c.ArchivedAt,
	)
	if err != nil {
		return nil, err
	}

	return &c, nil
}

func (r *Repository) SoftDelete(ctx context.Context, userID, categoryID string) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	const archiveCategory = `
		UPDATE categories
		SET archived_at = NOW(), updated_at = NOW()
		WHERE id = $1
		  AND user_id = $2
		  AND archived_at IS NULL
		  AND is_system = FALSE
		RETURNING id
	`

	var archivedID string
	if err := tx.QueryRow(ctx, archiveCategory, categoryID, userID).Scan(&archivedID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrCategoryNotFound
		}
		return err
	}

	const deactivateRecurring = `
		UPDATE recurring_rules
		SET active = FALSE, updated_at = NOW()
		WHERE user_id = $1
		  AND category_id = $2
		  AND active = TRUE
	`
	if _, err := tx.Exec(ctx, deactivateRecurring, userID, categoryID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *Repository) ExistsOwnedByUser(ctx context.Context, categoryID, userID string) (bool, error) {
	const q = `
		SELECT EXISTS (
			SELECT 1
			FROM categories
			WHERE id = $1
			  AND user_id = $2
			  AND archived_at IS NULL
		)
	`

	var ok bool
	err := r.db.Pool.QueryRow(ctx, q, categoryID, userID).Scan(&ok)
	return ok, err
}
