-- Enhanced payment system for store
-- This migration adds payment configurations, order items, and command logging

-- Payment Configurations Table
CREATE TABLE IF NOT EXISTS public.payment_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('stripe', 'paypal')),
  is_enabled boolean DEFAULT false,
  is_test_mode boolean DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider)
);

-- Enhanced Orders Table (add missing columns)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_provider text,
ADD COLUMN IF NOT EXISTS payment_intent_id text,
ADD COLUMN IF NOT EXISTS gateway_transaction_id text,
ADD COLUMN IF NOT EXISTS gateway_fee decimal(10,2),
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS billing_email text,
ADD COLUMN IF NOT EXISTS billing_address jsonb;

-- Order Items Table (for multiple items per order)
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.store_packages(id),
  quantity integer NOT NULL DEFAULT 1,
  price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Payment Logs Table (for webhook events)
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  event_type text NOT NULL,
  event_id text,
  status text NOT NULL,
  amount decimal(10,2),
  currency text DEFAULT 'USD',
  gateway_data jsonb,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Command Execution Logs Table
CREATE TABLE IF NOT EXISTS public.command_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.store_packages(id),
  username text NOT NULL,
  command text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'executed', 'failed', 'retrying')),
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  error_message text,
  executed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Store Categories Table (if not exists)
CREATE TABLE IF NOT EXISTS public.store_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  slug text UNIQUE NOT NULL,
  is_visible boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  parent_id uuid REFERENCES public.store_categories(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enhanced Store Packages Table (add missing columns)
ALTER TABLE public.store_packages 
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.store_categories(id),
ADD COLUMN IF NOT EXISTS command_template text,
ADD COLUMN IF NOT EXISTS duration_days integer,
ADD COLUMN IF NOT EXISTS stock_quantity integer,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sale_price decimal(10,2);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_order_id ON public.payment_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_command_logs_order_id ON public.command_execution_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_command_logs_status ON public.command_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_store_packages_category ON public.store_packages(category_id);

-- Enable RLS
ALTER TABLE public.payment_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

-- Insert default store categories
INSERT INTO public.store_categories (name, description, slug, sort_order) VALUES
('Ranks', 'Server ranks and permissions', 'ranks', 1),
('Items', 'In-game items and resources', 'items', 2),
('Cosmetics', 'Cosmetic items and effects', 'cosmetics', 3),
('Bundles', 'Package bundles and deals', 'bundles', 4)
ON CONFLICT (slug) DO NOTHING;
