-- Migration to initialize the featured package ID setting
-- This ensures the setting exists in the database

INSERT INTO site_settings (key, value, description, updated_at)
VALUES (
  'featured_package_id',
  'null',
  'ID of the package to feature on the home page',
  NOW()
)
ON CONFLICT (key) DO NOTHING;
