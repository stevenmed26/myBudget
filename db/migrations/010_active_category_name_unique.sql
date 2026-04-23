ALTER TABLE categories
DROP CONSTRAINT IF EXISTS categories_user_id_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS categories_active_user_name_unique_idx
    ON categories (user_id, LOWER(name))
    WHERE archived_at IS NULL;
