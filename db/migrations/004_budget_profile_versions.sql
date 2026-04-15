CREATE TABLE IF NOT EXISTS budget_profile_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tracking_cadence TEXT NOT NULL CHECK (tracking_cadence IN ('weekly', 'monthly')),
    week_starts_on INTEGER NOT NULL CHECK (week_starts_on BETWEEN 0 AND 6),
    monthly_anchor_day INTEGER NOT NULL CHECK (monthly_anchor_day BETWEEN 1 AND 28),
    currency_code TEXT NOT NULL DEFAULT 'USD',
    locale TEXT NOT NULL DEFAULT 'en-US',
    timezone TEXT NOT NULL DEFAULT 'America/Chicago',
    income_amount_cents BIGINT NOT NULL DEFAULT 0,
    income_cadence TEXT NOT NULL CHECK (income_cadence IN ('weekly', 'biweekly', 'monthly', 'yearly')),
    location_code TEXT NOT NULL DEFAULT 'US-TX',
    estimated_tax_rate_bps INTEGER NOT NULL DEFAULT 0 CHECK (estimated_tax_rate_bps BETWEEN 0 AND 10000),
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_profile_versions_user_dates
    ON budget_profile_versions(user_id, effective_from, effective_to);

INSERT INTO budget_profile_versions (
    user_id,
    tracking_cadence,
    week_starts_on,
    monthly_anchor_day,
    currency_code,
    locale,
    timezone,
    income_amount_cents,
    income_cadence,
    location_code,
    estimated_tax_rate_bps,
    effective_from
)
SELECT
    user_id,
    tracking_cadence,
    week_starts_on,
    monthly_anchor_day,
    currency_code,
    locale,
    timezone,
    income_amount_cents,
    income_cadence,
    location_code,
    estimated_tax_rate_bps,
    CURRENT_DATE
FROM budget_profiles bp
WHERE NOT EXISTS (
    SELECT 1
    FROM budget_profile_versions bpv
    WHERE bpv.user_id = bp.user_id
);