package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"mybudget-api/internal/db"
)

const verificationRateLimitActionSend = "send"

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
		SELECT id, email, password_hash, email_verified_at
		FROM users
		WHERE LOWER(email) = LOWER($1)
		LIMIT 1
	`

	var u UserRecord
	err := r.db.Pool.QueryRow(ctx, q, email).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.EmailVerifiedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) GetUserByID(ctx context.Context, userID string) (*UserRecord, error) {
	const q = `
		SELECT id, email, password_hash, email_verified_at
		FROM users
		WHERE id = $1
		LIMIT 1
	`

	var u UserRecord
	err := r.db.Pool.QueryRow(ctx, q, userID).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.EmailVerifiedAt)
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
			income_amount_cents, income_cadence, location_code, estimated_tax_rate_bps,
			smart_budgeting_enabled
		)
		VALUES ($1, 'weekly', 1, 1, 'USD', 'en-US', 'America/Chicago', 0, 'monthly', 'US-TX', 0, TRUE)
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
			smart_budgeting_enabled, effective_from
		)
		VALUES ($1, 'weekly', 1, 1, 'USD', 'en-US', 'America/Chicago', 0, 'monthly', 'US-TX', 0, TRUE, $2::date)
	`
	if _, err := tx.Exec(ctx, createProfileVersion, u.ID, effectiveFrom); err != nil {
		return nil, err
	}

	const seedCategories = `
		INSERT INTO categories (user_id, name, color, is_default, counts_toward_budget, is_system)
		SELECT $1, x.name, x.color, x.is_default, x.counts_toward_budget, x.is_system
		FROM (
			VALUES
				('Food', '#F97316', TRUE, TRUE, FALSE),
				('Savings', '#22C55E', TRUE, TRUE, FALSE),
				('Saved', '#14B8A6', TRUE, FALSE, TRUE),
				('Tax', '#EF4444', TRUE, TRUE, TRUE),
				('Housing', '#6366F1', TRUE, TRUE, FALSE)
		) AS x(name, color, is_default, counts_toward_budget, is_system)
		WHERE NOT EXISTS (
			SELECT 1
			FROM categories c
			WHERE c.user_id = $1
			  AND LOWER(c.name) = LOWER(x.name)
			  AND c.archived_at IS NULL
		)
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

func (r *Repository) RecordVerificationSendAttempt(ctx context.Context, email, ipAddress string, emailMax, ipMax int, cooldown, window time.Duration) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if err := recordVerificationRateLimit(ctx, tx, "email", email, emailMax, cooldown, window); err != nil {
		return err
	}
	if ipAddress != "" {
		if err := recordVerificationRateLimit(ctx, tx, "ip", ipAddress, ipMax, cooldown, window); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

type rateLimitTx interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func recordVerificationRateLimit(ctx context.Context, tx rateLimitTx, scope, identifier string, maxAttempts int, cooldown, window time.Duration) error {
	identifierHash := hashToken(identifier)

	const selectQ = `
		SELECT attempts, window_started_at, last_attempt_at
		FROM email_verification_rate_limits
		WHERE scope = $1
		  AND identifier_hash = $2
		  AND action = $3
		FOR UPDATE
	`

	now := time.Now()
	var attempts int
	var windowStartedAt time.Time
	var lastAttemptAt time.Time
	err := tx.QueryRow(ctx, selectQ, scope, identifierHash, verificationRateLimitActionSend).Scan(&attempts, &windowStartedAt, &lastAttemptAt)
	if errors.Is(err, pgx.ErrNoRows) {
		const insertQ = `
			INSERT INTO email_verification_rate_limits (
				scope, identifier_hash, action, attempts, window_started_at, last_attempt_at
			)
			VALUES ($1, $2, $3, 1, $4, $4)
		`
		_, err := tx.Exec(ctx, insertQ, scope, identifierHash, verificationRateLimitActionSend, now)
		return err
	}
	if err != nil {
		return err
	}

	if now.Sub(windowStartedAt) >= window {
		attempts = 0
		windowStartedAt = now
		lastAttemptAt = time.Time{}
	}

	if !lastAttemptAt.IsZero() && now.Sub(lastAttemptAt) < cooldown {
		return ErrVerificationRateLimited
	}
	if attempts >= maxAttempts {
		return ErrVerificationRateLimited
	}

	const updateQ = `
		UPDATE email_verification_rate_limits
		SET attempts = $4,
			window_started_at = $5,
			last_attempt_at = $6
		WHERE scope = $1
		  AND identifier_hash = $2
		  AND action = $3
	`
	_, err = tx.Exec(ctx, updateQ, scope, identifierHash, verificationRateLimitActionSend, attempts+1, windowStartedAt, now)
	return err
}

func (r *Repository) ConsumeVerificationCode(ctx context.Context, email, rawCode string, maxAttempts int) (string, error) {
	const q = `
		WITH candidate AS (
			SELECT id, user_id, code_hash, attempt_count
			FROM email_verification_codes
			WHERE LOWER(email) = LOWER($1)
			  AND consumed_at IS NULL
			  AND expires_at > NOW()
			ORDER BY created_at DESC
			LIMIT 1
			FOR UPDATE
		), updated AS (
			UPDATE email_verification_codes evc
			SET attempt_count = candidate.attempt_count + 1,
				consumed_at = CASE
					WHEN candidate.code_hash = $2 THEN NOW()
					ELSE evc.consumed_at
				END
			FROM candidate
			WHERE evc.id = candidate.id
			  AND candidate.attempt_count < $3
			RETURNING candidate.user_id, candidate.code_hash = $2 AS matched
		)
		SELECT user_id, matched
		FROM updated
	`

	var userID string
	var matched bool
	err := r.db.Pool.QueryRow(ctx, q, email, hashToken(rawCode), maxAttempts).Scan(&userID, &matched)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrInvalidVerification
	}
	if err != nil {
		return "", err
	}
	if !matched {
		return "", ErrInvalidVerification
	}
	return userID, nil
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
