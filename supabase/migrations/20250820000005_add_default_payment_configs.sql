-- Add default payment configurations if none exist
-- This ensures the payment system has basic configuration even without admin setup

-- Insert default Stripe configuration (disabled by default)
INSERT INTO public.payment_configurations (
  provider,
  is_enabled,
  is_test_mode,
  config,
  created_at,
  updated_at
) VALUES (
  'stripe',
  false, -- Disabled by default
  true,  -- Test mode by default
  '{"publishable_key": "", "secret_key": "", "webhook_secret": ""}',
  now(),
  now()
) ON CONFLICT (provider) DO NOTHING;

-- Insert default PayPal configuration (disabled by default)
INSERT INTO public.payment_configurations (
  provider,
  is_enabled,
  is_test_mode,
  config,
  created_at,
  updated_at
) VALUES (
  'paypal',
  false, -- Disabled by default
  true,  -- Test mode by default
  '{"client_id": "", "client_secret": "", "environment": "sandbox"}',
  now(),
  now()
) ON CONFLICT (provider) DO NOTHING;
