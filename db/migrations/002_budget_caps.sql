ALTER TABLE budget_profiles
    ADD COLUMN IF NOT EXISTS income_amount_cents BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS income_cadence TEXT NOT NULL DEFAULT 'monthly'
        CHECK (income_cadence IN ('weekly', 'biweekly', 'monthly', 'yearly')),
    ADD COLUMN IF NOT EXISTS location_code TEXT NOT NULL DEFAULT 'US-TX',
    ADD COLUMN IF NOT EXISTS estimated_tax_rate_bps INTEGER NOT NULL DEFAULT 0
        CHECK (estimated_tax_rate_bps BETWEEN 0 AND 10000);

UPDATE budget_profiles
SET
    income_amount_cents = 65000,
    income_cadence = 'monthly',
    location_code = 'US-TX',
    estimated_tax_rate_bps = 2000
WHERE user_id = '11111111-1111-1111-1111-111111111111';

INSERT INTO category_budgets (category_id, amount_cents, cadence, effective_from)
SELECT id, 15000, 'weekly', CURRENT_DATE
FROM categories
WHERE user_id = '11111111-1111-1111-1111-111111111111'
    AND name = 'Food'
ON CONFLICT DO NOTHING;

INSERT INTO category_budgets (category_id, amount_cents, cadence, effective_from)
SELECT id, 30000, 'weekly', CURRENT_DATE
FROM categories
WHERE user_id = '11111111-1111-1111-1111-111111111111'
    AND name = 'Housing'
ON CONFLICT DO NOTHING;

INSERT INTO category_budgets (category_id, amount_cents, cadence, effective_from)
SELECT id, 10000, 'weekly', CURRENT_DATE
FROM categories
WHERE user_id = '11111111-1111-1111-1111-111111111111'
    AND name = 'Savings'
ON CONFLICT DO NOTHING;

INSERT INTO category_budgets (category_id, amount_cents, cadence, effective_from)
SELECT id, 12000, 'weekly', CURRENT_DATE
FROM categories
WHERE user_id = '11111111-1111-1111-1111-111111111111'
    AND name = 'Tax'
ON CONFLICT DO NOTHING;