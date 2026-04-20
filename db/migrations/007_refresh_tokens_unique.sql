CREATE UNIQUE INDEX IF NOT EXISTS refresh_tokens_token_hash_unique_idx
    ON refresh_tokens (token_hash);
