-- Shopping Cart and Checkout System Migration
-- Adds cart functionality, coupons, and checkout workflow

-- Shopping Cart Table
CREATE TABLE IF NOT EXISTS public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text, -- For guest carts
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_cart UNIQUE (user_id),
  CONSTRAINT unique_session_cart UNIQUE (session_id),
  CONSTRAINT cart_owner_check CHECK (
    (user_id IS NOT NULL AND session_id IS NULL) OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  )
);

-- Cart Items Table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.store_packages(id) ON DELETE CASCADE,
  variant_id uuid, -- For future product variants
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_cart_product UNIQUE (cart_id, product_id, variant_id)
);

-- Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('percent', 'fixed')),
  value decimal(10,2) NOT NULL CHECK (value > 0),
  min_subtotal decimal(10,2),
  allowed_product_ids uuid[],
  allowed_category_ids uuid[],
  starts_at timestamptz,
  ends_at timestamptz,
  max_global_uses integer,
  max_per_user integer DEFAULT 1,
  current_uses integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Coupon Usage Tracking
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_amount decimal(10,2) NOT NULL,
  used_at timestamptz DEFAULT now(),
  CONSTRAINT usage_user_check CHECK (
    (user_id IS NOT NULL AND session_id IS NULL) OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  )
);

-- Enhanced Orders Table Updates
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS subtotal decimal(10,2),
ADD COLUMN IF NOT EXISTS discount_total decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_total decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_total decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS billing_name text,
ADD COLUMN IF NOT EXISTS coupon_code text,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS session_id text;

-- Update order status enum if needed
DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'awaiting_payment';
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refunded';
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Payment Events Table (replaces payment_logs with better structure)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  type text NOT NULL, -- 'created', 'succeeded', 'failed', 'refunded', etc.
  payload jsonb NOT NULL DEFAULT '{}',
  success boolean NOT NULL DEFAULT false,
  idempotency_key text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_idempotency UNIQUE (idempotency_key)
);

-- Store Settings Table
CREATE TABLE IF NOT EXISTS public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  category text DEFAULT 'general',
  updated_at timestamptz DEFAULT now()
);

-- Insert default store settings
INSERT INTO public.store_settings (key, value, category) VALUES
('general', '{
  "currency": "USD",
  "store_name": "MythicPvP Store",
  "support_email": "support@mythicpvp.net",
  "tos_url": "/terms",
  "refund_policy_url": "/refund-policy"
}', 'general'),
('taxes_fees', '{
  "tax_mode": "excluded",
  "tax_rate": 0.08,
  "processing_fee_enabled": false,
  "processing_fee_type": "percent",
  "processing_fee_value": 2.9
}', 'checkout'),
('payments', '{
  "enabled_providers": ["stripe", "paypal"],
  "statement_descriptor": "MYTHICPVP"
}', 'payments'),
('checkout', '{
  "theme": "auto",
  "success_message": "Thank you for your purchase! Your items will be delivered shortly.",
  "require_tos": true
}', 'appearance'),
('security', '{
  "pii_retention_days": 30
}', 'security')
ON CONFLICT (key) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session_id ON public.carts(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON public.coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON public.coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_order_id ON public.payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_idempotency ON public.payment_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_store_settings_category ON public.store_settings(category);

-- Enable RLS
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Carts: Users can manage their own carts
CREATE POLICY "Users can manage own cart" ON public.carts
  FOR ALL USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  );

-- Cart Items: Users can manage items in their carts
CREATE POLICY "Users can manage own cart items" ON public.cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.carts 
      WHERE carts.id = cart_items.cart_id 
      AND (carts.user_id = auth.uid() OR carts.session_id IS NOT NULL)
    )
  );

-- Coupons: Public read for active coupons
CREATE POLICY "Public can read active coupons" ON public.coupons
  FOR SELECT USING (active = true);

-- Admin can manage coupons
CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.user_profiles up ON ur.user_id = up.user_id
      WHERE up.user_id = auth.uid() 
      AND ur.role IN ('admin', 'owner')
    )
  );

-- Coupon Usage: Users can read their own usage
CREATE POLICY "Users can read own coupon usage" ON public.coupon_usage
  FOR SELECT USING (user_id = auth.uid());

-- System can insert coupon usage
CREATE POLICY "System can insert coupon usage" ON public.coupon_usage
  FOR INSERT WITH CHECK (true);

-- Payment Events: Users can read events for their orders
CREATE POLICY "Users can read payment events for own orders" ON public.payment_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = payment_events.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Store Settings: Public read access
CREATE POLICY "Public can read store settings" ON public.store_settings
  FOR SELECT USING (true);

-- Admin can manage store settings
CREATE POLICY "Admins can manage store settings" ON public.store_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.user_profiles up ON ur.user_id = up.user_id
      WHERE up.user_id = auth.uid() 
      AND ur.role IN ('admin', 'owner')
    )
  );

-- Functions for cart cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_carts()
RETURNS void AS $$
BEGIN
  -- Remove carts that haven't been updated in 30 days
  DELETE FROM public.carts 
  WHERE updated_at < NOW() - INTERVAL '30 days'
  AND user_id IS NULL; -- Only cleanup guest carts
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate cart totals
CREATE OR REPLACE FUNCTION calculate_cart_totals(
  cart_id_param uuid,
  coupon_code_param text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  subtotal decimal(10,2) := 0;
  discount_amount decimal(10,2) := 0;
  tax_amount decimal(10,2) := 0;
  fee_amount decimal(10,2) := 0;
  total decimal(10,2) := 0;
  coupon_record public.coupons%ROWTYPE;
  settings jsonb;
BEGIN
  -- Get cart subtotal
  SELECT COALESCE(SUM(ci.quantity * ci.unit_price), 0) INTO subtotal
  FROM public.cart_items ci
  WHERE ci.cart_id = cart_id_param;

  -- Apply coupon if provided
  IF coupon_code_param IS NOT NULL THEN
    SELECT * INTO coupon_record
    FROM public.coupons
    WHERE code = UPPER(coupon_code_param)
    AND active = true
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at >= NOW())
    AND (min_subtotal IS NULL OR subtotal >= min_subtotal);

    IF FOUND THEN
      IF coupon_record.type = 'percent' THEN
        discount_amount := subtotal * (coupon_record.value / 100);
      ELSE
        discount_amount := LEAST(coupon_record.value, subtotal);
      END IF;
    END IF;
  END IF;

  -- Get tax and fee settings
  SELECT value INTO settings
  FROM public.store_settings
  WHERE key = 'taxes_fees';

  -- Calculate tax (after discount)
  IF settings->>'tax_mode' = 'excluded' THEN
    tax_amount := (subtotal - discount_amount) * COALESCE((settings->>'tax_rate')::decimal, 0);
  END IF;

  -- Calculate processing fee
  IF COALESCE((settings->>'processing_fee_enabled')::boolean, false) THEN
    IF settings->>'processing_fee_type' = 'percent' THEN
      fee_amount := (subtotal - discount_amount + tax_amount) * 
                   (COALESCE((settings->>'processing_fee_value')::decimal, 0) / 100);
    ELSE
      fee_amount := COALESCE((settings->>'processing_fee_value')::decimal, 0);
    END IF;
  END IF;

  total := subtotal - discount_amount + tax_amount + fee_amount;

  RETURN jsonb_build_object(
    'subtotal', subtotal,
    'discount', discount_amount,
    'tax', tax_amount,
    'fees', fee_amount,
    'total', total,
    'valid_coupon', coupon_record.id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
