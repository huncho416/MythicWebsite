-- Add featured package selection setting
INSERT INTO public.site_settings (key, value, description, category, is_public, created_at, updated_at)
VALUES 
  ('featured_package_id', '""', 'ID of the package to feature on the homepage', 'featured', true, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;
