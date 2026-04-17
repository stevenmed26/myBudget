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

func (r *Repository) FindValidRefreshToken(ctx context.Context, rawToken string) (string, error) {
	const q = `
		SELECT user_id
		FROM refresh_tokens
		WHERE token_hash = $1
		  AND revoked_at IS NULL
		  AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`

	var userID string
	err := r.db.Pool.QueryRow(ctx, q, hashToken(rawToken)).Scan(&userID)
	return userID, err
}

func (r *Repository) RevokeRefreshToken(ctx context.Context, rawToken string) error {
	const q = `
		UPDATE refresh_tokens
		SET revoked_at = NOW()
		WHERE token_hash = $1
		  AND revoked_at IS NULL
	`
	_, err := r.db.Pool.Exec(ctx, q, hashToken(rawToken))
	return err
}

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

func (r *Repository) ReplaceVerificationCode(ctx context.Context, userID, email, rawCode string, expiresAt time.Time) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	const revokeOld = `
		UPDATE email_verification_codes
		SET consumed_at = NOW()
		WHERE user_id = $1
		  AND consumed_at IS NULL
	`
	if _, err := tx.Exec(ctx, revokeOld, userID); err != nil {
		return err
	}

	const insertCode = `
		INSERT INTO email_verification_codes (user_id, email, code_hash, expires_at)
		VALUES ($1, $2, $3, $4)
	`
	if _, err := tx.Exec(ctx, insertCode, userID, email, hashToken(rawCode), expiresAt); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *Repository) ConsumeVerificationCode(ctx context.Context, email, rawCode string) (string, error) {
	const q = `
		WITH candidate AS (
			SELECT id, user_id
			FROM email_verification_codes
			WHERE LOWER(email) = LOWER($1)
			  AND code_hash = $2
			  AND consumed_at IS NULL
			  AND expires_at > NOW()
			ORDER BY created_at DESC
			LIMIT 1
		)
		UPDATE email_verification_codes evc
		SET consumed_at = NOW()
		FROM candidate
		WHERE evc.id = candidate.id
		RETURNING candidate.user_id
	`

	var userID string
	err := r.db.Pool.QueryRow(ctx, q, email, hashToken(rawCode)).Scan(&userID)
	return userID, err
}

func (r *Repository) MarkUserEmailVerified(ctx context.Context, userID string) error {
	const q = `
		UPDATE users
		SET email_verified_at = NOW()
		WHERE id = $1
		  AND email_verified_at IS NULL
	`
	_, err := r.db.Pool.Exec(ctx, q, userID)
	return err
}

func IsNotFound(err error) bool {
	return err == pgx.ErrNoRows
}