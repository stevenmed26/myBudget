ALTER TABLE budget_profiles
ADD COLUMN IF NOT EXISTS smart_budgeting_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE budget_profile_versions
ADD COLUMN IF NOT EXISTS smart_budgeting_enabled BOOLEAN NOT NULL DEFAULT TRUE;
