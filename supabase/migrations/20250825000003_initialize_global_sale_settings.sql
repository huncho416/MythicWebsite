-- Initialize global sale settings if not exists
INSERT INTO public.store_settings (key, value, category, updated_at)
VALUES (
  'global_sale',
  '{
    "enabled": false,
    "percentage": 0,
    "start_date": null,
    "end_date": null,
    "message": ""
  }'::jsonb,
  'store',
  now()
)
ON CONFLICT (key) DO NOTHING;
