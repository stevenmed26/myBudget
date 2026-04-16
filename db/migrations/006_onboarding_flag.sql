ALTER TABLE budget_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;