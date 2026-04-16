ALTER TABLE budget_profiles
    ADD COLUMN IF NOT EXISTS income_amount_cents BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS income_cadence TEXT NOT NULL DEFAULT 'monthly'
        CHECK (income_cadence IN ('weekly', 'biweekly', 'monthly', 'yearly')),
    ADD COLUMN IF NOT EXISTS location_code TEXT NOT NULL DEFAULT 'US-TX',
    ADD COLUMN IF NOT EXISTS estimated_tax_rate_bps INTEGER NOT NULL DEFAULT 0
        CHECK (estimated_tax_rate_bps BETWEEN 0 AND 10000);

UPDATE budget_profiles
SET
    income_amount_cents = 650000,
    income_cadence = 'monthly',
    location_code = 'US-TX',
    estimated_tax_rate_bps = 2000
WHERE user_id = '11111111-1111-1111-1111-111111111111';

INSERT INTO category_budgets (category_id, amount_cents, cadence, effective_from)
SELECT c.id, 15000, 'weekly', CURRENT_DATE
FROM categories c
WHERE c.user_id = '11111111-1111-1111-1111-111111111111'
  AND c.name = 'Food'
  AND NOT EXISTS (
      SELECT 1
      FROM category_budgets cb
      WHERE cb.category_id = c.id
        AND cb.amount_cents = 15000
        AND cb.cadence = 'weekly'
        AND cb.effective_from = CURRENT_DATE
  );

INSERT INTO category_budgets (category_id, amount_cents, cadence, effective_from)
SELECT c.id, 30000, 'weekly', CURRENT_DATE
FROM categories c
WHERE c.user_id = '11111111-1111-1111-1111-111111111111'
  AND c.name = 'Housing'
  AND NOT EXISTS (
      SELECT 1
      FROM category_budgets cb
      WHERE cb.category_id = c.id
        AND cb.amount_cents = 30000
        AND cb.cadence = 'weekly'
        AND cb.effective_from = CURRENT_DATE
  );

INSERT INTO category_budgets (category_id, amount_cents, cadence, effective_from)
SELECT c.id, 10000, 'weekly', CURRENT_DATE
FROM categories c
WHERE c.user_id = '11111111-1111-1111-1111-111111111111'
  AND c.name = 'Savings'
  AND NOT EXISTS (
      SELECT 1
      FROM category_budgets cb
      WHERE cb.category_id = c.id
        AND cb.amount_cents = 10000
        AND cb.cadence = 'weekly'
        AND cb.effective_from = CURRENT_DATE
  );

INSERT INTO category_budgets (category_id, amount_cents, cadence, effective_from)
SELECT c.id, 12000, 'weekly', CURRENT_DATE
FROM categories c
WHERE c.user_id = '11111111-1111-1111-1111-111111111111'
  AND c.name = 'Tax'
  AND NOT EXISTS (
      SELECT 1
      FROM category_budgets cb
      WHERE cb.category_id = c.id
        AND cb.amount_cents = 12000
        AND cb.cadence = 'weekly'
        AND cb.effective_from = CURRENT_DATE
  );