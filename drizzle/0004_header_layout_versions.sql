-- Register the new header render versions without changing existing layouts,
-- prices, ownership records or publication snapshots. A fresh installation's
-- normal catalog registration also inserts these versions.
INSERT INTO component_versions (component_key, version, schema)
SELECT component_key, 3, schema
FROM component_versions
WHERE version = 2
  AND component_key IN ('header-minimal', 'header-centered', 'header-dark')
ON CONFLICT (component_key, version) DO NOTHING;
