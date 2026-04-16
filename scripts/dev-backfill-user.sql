-- Usage:
--   \set target_email 'test@test.com'
--   \i scripts/dev-backfill-user.sql

BEGIN;

-- 1) Ensure base budget profile exists
INSERT INTO budget_profiles (
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
    estimated_tax_rate_bps
)
SELECT
    u.id,
    'weekly',
    1,
    1,
    'USD',
    'en-US',
    'America/Chicago',
    0,
    'monthly',
    'US-TX',
    0
FROM users u
WHERE LOWER(u.email) = LOWER(:'target_email')
  AND NOT EXISTS (
      SELECT 1
      FROM budget_profiles bp
      WHERE bp.user_id = u.id
  );

-- 2) Ensure current profile version exists
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
    u.id,
    COALESCE(bp.tracking_cadence, 'weekly'),
    COALESCE(bp.week_starts_on, 1),
    COALESCE(bp.monthly_anchor_day, 1),
    COALESCE(bp.currency_code, 'USD'),
    COALESCE(bp.locale, 'en-US'),
    COALESCE(bp.timezone, 'America/Chicago'),
    COALESCE(bp.income_amount_cents, 0),
    COALESCE(bp.income_cadence, 'monthly'),
    COALESCE(bp.location_code, 'US-TX'),
    COALESCE(bp.estimated_tax_rate_bps, 0),
    CURRENT_DATE
FROM users u
LEFT JOIN budget_profiles bp ON bp.user_id = u.id
WHERE LOWER(u.email) = LOWER(:'target_email')
  AND NOT EXISTS (
      SELECT 1
      FROM budget_profile_versions bpv
      WHERE bpv.user_id = u.id
        AND bpv.effective_to IS NULL
  );

-- 3) Ensure default categories exist
INSERT INTO categories (
    user_id,
    name,
    color,
    is_default,
    counts_toward_budget,
    is_system
)
SELECT
    u.id,
    x.name,
    x.color,
    x.is_default,
    x.counts_toward_budget,
    x.is_system
FROM users u
CROSS JOIN (
    VALUES
        ('Food',    '#F97316', TRUE, TRUE,  FALSE),
        ('Savings', '#22C55E', TRUE, TRUE,  FALSE),
        ('Saved',   '#14B8A6', TRUE, FALSE, TRUE),
        ('Tax',     '#EF4444', TRUE, TRUE,  TRUE),
        ('Housing', '#6366F1', TRUE, TRUE,  FALSE)
) AS x(name, color, is_default, counts_toward_budget, is_system)
WHERE LOWER(u.email) = LOWER(:'target_email')
ON CONFLICT (user_id, name) DO NOTHING;

-- 4) Ensure demo-style initial category budgets exist for defaults
INSERT INTO category_budgets (category_id, amount_cents, cadence, effective_from)
SELECT c.id, x.amount_cents, 'weekly', CURRENT_DATE
FROM categories c
JOIN users u ON u.id = c.user_id
JOIN (
    VALUES
        ('Food', 15000),
        ('Housing', 30000),
        ('Savings', 10000),
        ('Tax', 12000)
) AS x(name, amount_cents) ON x.name = c.name
WHERE LOWER(u.email) = LOWER(:'target_email')
  AND NOT EXISTS (
      SELECT 1
      FROM category_budgets cb
      WHERE cb.category_id = c.id
        AND cb.effective_to IS NULL
  );

-- 5) Ensure an open current budget period exists
INSERT INTO budget_periods (
    user_id,
    start_date,
    end_date,
    cadence,
    status
)
SELECT
    u.id,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '6 days',
    'weekly',
    'open'
FROM users u
WHERE LOWER(u.email) = LOWER(:'target_email')
  AND NOT EXISTS (
      SELECT 1
      FROM budget_periods bp
      WHERE bp.user_id = u.id
        AND bp.status = 'open'
  );

COMMIT;

-- Helpful inspection
SELECT u.id, u.email
FROM users u
WHERE LOWER(u.email) = LOWER(:'target_email');

SELECT *
FROM budget_profiles bp
WHERE bp.user_id = (
    SELECT id FROM users WHERE LOWER(email) = LOWER(:'target_email')
);

SELECT *
FROM budget_profile_versions bpv
WHERE bpv.user_id = (
    SELECT id FROM users WHERE LOWER(email) = LOWER(:'target_email')
)
ORDER BY effective_from DESC, created_at DESC;

SELECT name, counts_toward_budget, is_system
FROM categories
WHERE user_id = (
    SELECT id FROM users WHERE LOWER(email) = LOWER(:'target_email')
)
ORDER BY name;