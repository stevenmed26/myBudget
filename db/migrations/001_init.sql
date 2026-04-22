CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tracking_cadence TEXT NOT NULL CHECK (tracking_cadence IN ('weekly', 'monthly')),
    week_starts_on INTEGER NOT NULL DEFAULT 1 CHECK (week_starts_on BETWEEN 0 AND 6),
    monthly_anchor_day INTEGER NOT NULL DEFAULT 1 CHECK (monthly_anchor_day BETWEEN 1 AND 28),
    currency_code TEXT NOT NULL DEFAULT 'USD',
    locale TEXT NOT NULL DEFAULT 'en-US',
    timezone TEXT NOT NULL DEFAULT 'America/Chicago',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS budget_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    cadence TEXT NOT NULL CHECK (cadence IN ('weekly', 'monthly')),
    status TEXT NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6B7280',
    icon TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    counts_toward_budget BOOLEAN NOT NULL DEFAULT TRUE,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS category_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
    cadence TEXT NOT NULL CHECK (cadence IN ('weekly', 'monthly', 'yearly')),
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    amount_cents BIGINT NOT NULL CHECK (amount_cents <> 0),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income', 'adjustment', 'saved_rollover')),
    transaction_date DATE NOT NULL,
    merchant_name TEXT,
    note TEXT,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'recurring', 'system')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
    ON transactions(user_id, transaction_date)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_category_date
    ON transactions(category_id, transaction_date)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS recurring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    amount_cents BIGINT NOT NULL CHECK (amount_cents <> 0),
    rule_type TEXT NOT NULL CHECK (rule_type IN ('expense', 'income', 'allocation')),
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE,
    next_run_date DATE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (id, email)
VALUES ('11111111-1111-1111-1111-111111111111', 'demo@mybudget.local')
ON CONFLICT (email) DO NOTHING;

INSERT INTO budget_profiles (
    user_id,
    tracking_cadence,
    week_starts_on,
    monthly_anchor_day,
    currency_code,
    locale,
    timezone
)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'weekly',
    1,
    1,
    'USD',
    'en-US',
    'America/Chicago'
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO categories (user_id, name, color, is_default, counts_toward_budget, is_system)
SELECT '11111111-1111-1111-1111-111111111111', x.name, x.color, x.is_default, x.counts_toward_budget, x.is_system
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
    WHERE c.user_id = '11111111-1111-1111-1111-111111111111'
      AND LOWER(c.name) = LOWER(x.name)
      AND c.archived_at IS NULL
);
