-- Comprehensive Admin Backend Schema
-- This migration creates all tables needed for the admin system

-- 1) Create enums
DO $$ BEGIN
  -- Forum category types
  CREATE TYPE public.forum_category_type AS ENUM (
    'general',
    'announcements',
    'support',
    'suggestions',
    'off_topic'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  -- Support ticket status
  CREATE TYPE public.ticket_status AS ENUM (
    'open',
    'in_progress',
    'waiting_response',
    'resolved',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  -- Support ticket priority
  CREATE TYPE public.ticket_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  -- Package type enum
  CREATE TYPE public.package_type AS ENUM (
    'one_time',
    'subscription',
    'bundle'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  -- Discount type enum
  CREATE TYPE public.discount_type AS ENUM (
    'percentage',
    'fixed_amount'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  -- Payment status enum
  CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) User profiles table (extended user information)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  bio text,
  minecraft_username text,
  discord_id text,
  total_spent decimal(10,2) DEFAULT 0,
  join_date timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  is_banned boolean DEFAULT false,
  ban_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- 3) Forum categories
CREATE TABLE IF NOT EXISTS public.forum_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  slug text UNIQUE NOT NULL,
  icon text,
  color text DEFAULT '#6366f1',
  sort_order integer DEFAULT 0,
  category_type public.forum_category_type DEFAULT 'general',
  is_locked boolean DEFAULT false,
  min_role_to_view public.app_role DEFAULT null,
  min_role_to_post public.app_role DEFAULT null,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4) Forum threads
CREATE TABLE IF NOT EXISTS public.forum_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  view_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  last_reply_at timestamptz DEFAULT now(),
  last_reply_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5) Forum replies
CREATE TABLE IF NOT EXISTS public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  reply_to uuid REFERENCES public.forum_replies(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6) Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id),
  subject text NOT NULL,
  description text NOT NULL,
  status public.ticket_status DEFAULT 'open',
  priority public.ticket_priority DEFAULT 'medium',
  category text,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz
);

-- 7) Support ticket messages
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_internal boolean DEFAULT false,
  attachments text[],
  created_at timestamptz DEFAULT now()
);

-- 8) Store categories
CREATE TABLE IF NOT EXISTS public.store_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  slug text UNIQUE NOT NULL,
  icon text,
  color text DEFAULT '#6366f1',
  sort_order integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 9) Store packages
CREATE TABLE IF NOT EXISTS public.store_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.store_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  short_description text,
  price decimal(10,2) NOT NULL,
  original_price decimal(10,2),
  package_type public.package_type DEFAULT 'one_time',
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  image_url text,
  commands text[],
  items jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 10) Discounts/Sales
CREATE TABLE IF NOT EXISTS public.discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  discount_type public.discount_type NOT NULL,
  discount_value decimal(10,2) NOT NULL,
  min_purchase_amount decimal(10,2) DEFAULT 0,
  max_uses integer,
  uses_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  starts_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  applicable_packages uuid[],
  applicable_categories uuid[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 11) Gift cards
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  amount decimal(10,2) NOT NULL,
  remaining_balance decimal(10,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  used_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz
);

-- 12) Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount decimal(10,2) NOT NULL,
  discount_amount decimal(10,2) DEFAULT 0,
  gift_card_amount decimal(10,2) DEFAULT 0,
  final_amount decimal(10,2) NOT NULL,
  status public.payment_status DEFAULT 'pending',
  payment_method text,
  payment_id text,
  discount_code text,
  gift_card_code text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 13) Order items
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.store_packages(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 14) User bans/punishments
CREATE TABLE IF NOT EXISTS public.user_punishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moderator_id uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL, -- 'ban', 'mute', 'warning', 'kick'
  reason text NOT NULL,
  duration_minutes integer, -- null for permanent
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id)
);

-- 15) Site settings
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  category text DEFAULT 'general',
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_punishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin_or_above(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('admin', 'senior_admin', 'system_admin', 'owner')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_moderator_or_above(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('moderator', 'senior_moderator', 'admin', 'senior_admin', 'system_admin', 'owner')
  );
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_forum_threads_category_id ON public.forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_author_id ON public.forum_threads(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread_id ON public.forum_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_store_packages_category_id ON public.store_packages(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_user_punishments_user_id ON public.user_punishments(user_id);
