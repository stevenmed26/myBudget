ALTER TABLE budget_periods
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS saved_rollover_transaction_id UUID,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'budget_periods_status_check'
    ) THEN
        ALTER TABLE budget_periods
            ADD CONSTRAINT budget_periods_status_check
            CHECK (status IN ('open', 'closed'));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_periods_user_period
    ON budget_periods(user_id, start_date, end_date);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'budget_periods_saved_rollover_fk'
    ) THEN
        ALTER TABLE budget_periods
            ADD CONSTRAINT budget_periods_saved_rollover_fk
            FOREIGN KEY (saved_rollover_transaction_id)
            REFERENCES transactions(id)
            ON DELETE SET NULL;
    END IF;
END $$;