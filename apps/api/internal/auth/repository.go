package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"

	"mybudget-api/internal/db"
)

type Repository struct {
	db *db.DB
}

func NewRepository(db *db.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) EmailExists(ctx context.Context, email string) (bool, error) {
	const q = `
		SELECT EXISTS (
			SELECT 1
			FROM users
			WHERE LOWER(email) = LOWER($1)
		)
	`

	var exists bool
	err := r.db.Pool.QueryRow(ctx, q, email).Scan(&exists)
	return exists, err
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*UserRecord, error) {
	const q = `
		SELECT id, email, password_hash
		FROM users
		WHERE LOWER(email) = LOWER($1)
		LIMIT 1
	`

	var u UserRecord
	err := r.db.Pool.QueryRow(ctx, q, email).Scan(&u.ID, &u.Email, &u.PasswordHash)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) GetUserByID(ctx context.Context, userID string) (*UserRecord, error) {
	const q = `
		SELECT id, email, password_hash
		FROM users
		WHERE id = $1
		LIMIT 1
	`

	var u UserRecord
	err := r.db.Pool.QueryRow(ctx, q, userID).Scan(&u.ID, &u.Email, &u.PasswordHash)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) CreateUserWithDefaults(ctx context.Context, email, passwordHash, effectiveFrom string) (*UserRecord, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	const createUser = `
		INSERT INTO users (id, email, password_hash)
		VALUES (gen_random_uuid(), $1, $2)
		RETURNING id, email, password_hash
	`

	var u UserRecord
	if err := tx.QueryRow(ctx, createUser, email, passwordHash).Scan(&u.ID, &u.Email, &u.PasswordHash); err != nil {
		return nil, err
	}

	const createProfile = `
		INSERT INTO budget_profiles (
			user_id, tracking_cadence, week_starts_on, monthly_anchor_day,
			currency_code, locale, timezone,
			income_amount_cents, income_cadence, location_code, estimated_tax_rate_bps
		)
		VALUES ($1, 'weekly', 1, 1, 'USD', 'en-US', 'America/Chicago', 0, 'monthly', 'US-TX', 0)
		ON CONFLICT (user_id) DO NOTHING
	`
	if _, err := tx.Exec(ctx, createProfile, u.ID); err != nil {
		return nil, err
	}

	const createProfileVersion = `
		INSERT INTO budget_profile_versions (
			user_id, tracking_cadence, week_starts_on, monthly_anchor_day,
			currency_code, locale, timezone,
			income_amount_cents, income_cadence, location_code, estimated_tax_rate_bps,
			effective_from
		)
		VALUES ($1, 'weekly', 1, 1, 'USD', 'en-US', 'America/Chicago', 0, 'monthly', 'US-TX', 0, $2::date)
	`
	if _, err := tx.Exec(ctx, createProfileVersion, u.ID, effectiveFrom); err != nil {
		return nil, err
	}

	const seedCategories = `
		INSERT INTO categories (user_id, name, color, is_default, counts_toward_budget, is_system)
		VALUES
			($1, 'Food', '#F97316', TRUE, TRUE, FALSE),
			($1, 'Savings', '#22C55E', TRUE, TRUE, FALSE),
			($1, 'Saved', '#14B8A6', TRUE, FALSE, TRUE),
			($1, 'Tax', '#EF4444', TRUE, TRUE, TRUE),
			($1, 'Housing', '#6366F1', TRUE, TRUE, FALSE)
		ON CONFLICT (user_id, name) DO NOTHING
	`
	if _, err := tx.Exec(ctx, seedCategories, u.ID); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &u, nil
}

func hashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func (r *Repository) InsertRefreshToken(ctx context.Context, userID, rawToken string, expiresAt time.Time) error {
	const q = `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`
	_, err := r.db.Pool.Exec(ctx, q, userID, hashToken(rawToken), expiresAt)
	return err
}

var ErrInvalidRefreshToken = errors.New("invalid refresh token")

func (r *Repository) ConsumeRefreshToken(ctx context.Context, rawToken string) (string, error) {
	const q = `
		UPDATE refresh_tokens
		SET revoked_at = NOW()
		WHERE token_hash = $1
		  AND revoked_at IS NULL
		  AND expires_at > NOW()
		RETURNING user_id
	`

	var userID string
	err := r.db.Pool.QueryRow(ctx, q, hashToken(rawToken)).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrInvalidRefreshToken
	}
	return userID, err
}
