UPDATE categories c
SET name = 'Withholding',
    updated_at = NOW()
WHERE LOWER(c.name) = 'tax'
  AND c.archived_at IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM categories existing
      WHERE existing.user_id = c.user_id
        AND LOWER(existing.name) = 'withholding'
        AND existing.archived_at IS NULL
  );

UPDATE recurring_rules
SET name = CASE name
    WHEN 'Federal income tax estimate' THEN 'Federal income tax withholding'
    WHEN 'State income tax estimate' THEN 'State income tax withholding'
    WHEN 'Social Security estimate' THEN 'Social Security withholding'
    WHEN 'Medicare estimate' THEN 'Medicare withholding'
    ELSE name
END,
updated_at = NOW()
WHERE name IN (
    'Federal income tax estimate',
    'State income tax estimate',
    'Social Security estimate',
    'Medicare estimate'
);
