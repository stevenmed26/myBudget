SELECT 'users' AS object, to_regclass('public.users') IS NOT NULL AS ok
UNION ALL
SELECT 'budget_profiles', to_regclass('public.budget_profiles') IS NOT NULL
UNION ALL
SELECT 'budget_profile_versions', to_regclass('public.budget_profile_versions') IS NOT NULL
UNION ALL
SELECT 'budget_periods', to_regclass('public.budget_periods') IS NOT NULL
UNION ALL
SELECT 'categories', to_regclass('public.categories') IS NOT NULL
UNION ALL
SELECT 'category_budgets', to_regclass('public.category_budgets') IS NOT NULL
UNION ALL
SELECT 'transactions', to_regclass('public.transactions') IS NOT NULL
UNION ALL
SELECT 'refresh_tokens', to_regclass('public.refresh_tokens') IS NOT NULL;

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'password_hash';

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'categories'
  AND column_name IN ('counts_toward_budget', 'is_system', 'archived_at')
ORDER BY column_name;

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'budget_periods'
  AND column_name IN ('closed_at', 'saved_rollover_transaction_id', 'created_at', 'updated_at')
ORDER BY column_name;