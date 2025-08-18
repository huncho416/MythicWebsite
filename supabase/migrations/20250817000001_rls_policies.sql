-- RLS Policies for all tables
-- This file contains all Row Level Security policies

-- USER PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view public profiles" ON public.user_profiles;
CREATE POLICY "Users can view public profiles"
ON public.user_profiles
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage all profiles"
ON public.user_profiles
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- FORUM CATEGORIES POLICIES
DROP POLICY IF EXISTS "Anyone can view categories" ON public.forum_categories;
CREATE POLICY "Anyone can view categories"
ON public.forum_categories
FOR SELECT
USING (
  min_role_to_view IS NULL OR 
  public.has_role(auth.uid(), min_role_to_view) OR
  public.is_moderator_or_above(auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.forum_categories;
CREATE POLICY "Admins can manage categories"
ON public.forum_categories
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- FORUM THREADS POLICIES
DROP POLICY IF EXISTS "Anyone can view threads" ON public.forum_threads;
CREATE POLICY "Anyone can view threads"
ON public.forum_threads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.forum_categories fc
    WHERE fc.id = category_id
    AND (fc.min_role_to_view IS NULL OR 
         public.has_role(auth.uid(), fc.min_role_to_view) OR
         public.is_moderator_or_above(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users can create threads" ON public.forum_threads;
CREATE POLICY "Users can create threads"
ON public.forum_threads
FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM public.forum_categories fc
    WHERE fc.id = category_id
    AND (fc.min_role_to_post IS NULL OR 
         public.has_role(auth.uid(), fc.min_role_to_post) OR
         public.is_moderator_or_above(auth.uid()))
    AND NOT fc.is_locked
  )
);

DROP POLICY IF EXISTS "Authors can update own threads" ON public.forum_threads;
CREATE POLICY "Authors can update own threads"
ON public.forum_threads
FOR UPDATE
USING (auth.uid() = author_id OR public.is_moderator_or_above(auth.uid()))
WITH CHECK (auth.uid() = author_id OR public.is_moderator_or_above(auth.uid()));

DROP POLICY IF EXISTS "Moderators can manage threads" ON public.forum_threads;
CREATE POLICY "Moderators can manage threads"
ON public.forum_threads
FOR ALL
USING (public.is_moderator_or_above(auth.uid()))
WITH CHECK (public.is_moderator_or_above(auth.uid()));

-- FORUM REPLIES POLICIES
DROP POLICY IF EXISTS "Anyone can view replies" ON public.forum_replies;
CREATE POLICY "Anyone can view replies"
ON public.forum_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.forum_threads ft
    JOIN public.forum_categories fc ON ft.category_id = fc.id
    WHERE ft.id = thread_id
    AND (fc.min_role_to_view IS NULL OR 
         public.has_role(auth.uid(), fc.min_role_to_view) OR
         public.is_moderator_or_above(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users can create replies" ON public.forum_replies;
CREATE POLICY "Users can create replies"
ON public.forum_replies
FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM public.forum_threads ft
    JOIN public.forum_categories fc ON ft.category_id = fc.id
    WHERE ft.id = thread_id
    AND (fc.min_role_to_post IS NULL OR 
         public.has_role(auth.uid(), fc.min_role_to_post) OR
         public.is_moderator_or_above(auth.uid()))
    AND NOT fc.is_locked
    AND NOT ft.is_locked
  )
);

DROP POLICY IF EXISTS "Authors can update own replies" ON public.forum_replies;
CREATE POLICY "Authors can update own replies"
ON public.forum_replies
FOR UPDATE
USING (auth.uid() = author_id OR public.is_moderator_or_above(auth.uid()))
WITH CHECK (auth.uid() = author_id OR public.is_moderator_or_above(auth.uid()));

DROP POLICY IF EXISTS "Moderators can manage replies" ON public.forum_replies;
CREATE POLICY "Moderators can manage replies"
ON public.forum_replies
FOR ALL
USING (public.is_moderator_or_above(auth.uid()))
WITH CHECK (public.is_moderator_or_above(auth.uid()));

-- SUPPORT TICKETS POLICIES
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
CREATE POLICY "Users can view own tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = user_id OR public.is_moderator_or_above(auth.uid()));

DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tickets" ON public.support_tickets;
CREATE POLICY "Users can update own tickets"
ON public.support_tickets
FOR UPDATE
USING (auth.uid() = user_id OR public.is_moderator_or_above(auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_moderator_or_above(auth.uid()));

-- SUPPORT TICKET MESSAGES POLICIES
DROP POLICY IF EXISTS "Users can view relevant messages" ON public.support_ticket_messages;
CREATE POLICY "Users can view relevant messages"
ON public.support_ticket_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_id
    AND (st.user_id = auth.uid() OR public.is_moderator_or_above(auth.uid()))
  )
  AND (NOT is_internal OR public.is_moderator_or_above(auth.uid()))
);

DROP POLICY IF EXISTS "Users can create messages" ON public.support_ticket_messages;
CREATE POLICY "Users can create messages"
ON public.support_ticket_messages
FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_id
    AND (st.user_id = auth.uid() OR public.is_moderator_or_above(auth.uid()))
  )
);

-- STORE CATEGORIES POLICIES
DROP POLICY IF EXISTS "Anyone can view store categories" ON public.store_categories;
CREATE POLICY "Anyone can view store categories"
ON public.store_categories
FOR SELECT
USING (is_active = true OR public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage store categories" ON public.store_categories;
CREATE POLICY "Admins can manage store categories"
ON public.store_categories
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- STORE PACKAGES POLICIES
DROP POLICY IF EXISTS "Anyone can view store packages" ON public.store_packages;
CREATE POLICY "Anyone can view store packages"
ON public.store_packages
FOR SELECT
USING (is_active = true OR public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage store packages" ON public.store_packages;
CREATE POLICY "Admins can manage store packages"
ON public.store_packages
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- DISCOUNTS POLICIES
DROP POLICY IF EXISTS "Anyone can view active discounts" ON public.discounts;
CREATE POLICY "Anyone can view active discounts"
ON public.discounts
FOR SELECT
USING (is_active = true OR public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage discounts" ON public.discounts;
CREATE POLICY "Admins can manage discounts"
ON public.discounts
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- GIFT CARDS POLICIES
DROP POLICY IF EXISTS "Users can view own gift cards" ON public.gift_cards;
CREATE POLICY "Users can view own gift cards"
ON public.gift_cards
FOR SELECT
USING (auth.uid() = used_by OR public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage gift cards" ON public.gift_cards;
CREATE POLICY "Admins can manage gift cards"
ON public.gift_cards
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- ORDERS POLICIES
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id OR public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage orders"
ON public.orders
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- ORDER ITEMS POLICIES
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND (o.user_id = auth.uid() OR public.is_admin_or_above(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
CREATE POLICY "Users can create order items"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND o.user_id = auth.uid()
  )
);

-- USER PUNISHMENTS POLICIES
DROP POLICY IF EXISTS "Users can view own punishments" ON public.user_punishments;
CREATE POLICY "Users can view own punishments"
ON public.user_punishments
FOR SELECT
USING (auth.uid() = user_id OR public.is_moderator_or_above(auth.uid()));

DROP POLICY IF EXISTS "Moderators can manage punishments" ON public.user_punishments;
CREATE POLICY "Moderators can manage punishments"
ON public.user_punishments
FOR ALL
USING (public.is_moderator_or_above(auth.uid()))
WITH CHECK (public.is_moderator_or_above(auth.uid()));

-- SITE SETTINGS POLICIES
DROP POLICY IF EXISTS "Anyone can view public settings" ON public.site_settings;
CREATE POLICY "Anyone can view public settings"
ON public.site_settings
FOR SELECT
USING (is_public = true OR public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage settings" ON public.site_settings;
CREATE POLICY "Admins can manage settings"
ON public.site_settings
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- Functions for ticket number generation
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  ticket_num text;
BEGIN
  SELECT 'TKT-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 5) AS integer)), 0) + 1)::text, 6, '0')
  INTO ticket_num
  FROM public.support_tickets
  WHERE ticket_number ~ '^TKT-[0-9]+$';
  
  RETURN ticket_num;
END;
$$;

-- Function for order number generation
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  order_num text;
BEGIN
  SELECT 'ORD-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5) AS integer)), 0) + 1)::text, 8, '0')
  INTO order_num
  FROM public.orders
  WHERE order_number ~ '^ORD-[0-9]+$';
  
  RETURN order_num;
END;
$$;

-- Triggers to auto-generate numbers
CREATE OR REPLACE FUNCTION public.auto_generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := public.generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_auto_ticket_number ON public.support_tickets;
CREATE TRIGGER trigger_auto_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_ticket_number();

DROP TRIGGER IF EXISTS trigger_auto_order_number ON public.orders;
CREATE TRIGGER trigger_auto_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_order_number();

-- Update timestamps triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add update triggers to all relevant tables
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_forum_categories_updated_at ON public.forum_categories;
CREATE TRIGGER update_forum_categories_updated_at
  BEFORE UPDATE ON public.forum_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_forum_threads_updated_at ON public.forum_threads;
CREATE TRIGGER update_forum_threads_updated_at
  BEFORE UPDATE ON public.forum_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_forum_replies_updated_at ON public.forum_replies;
CREATE TRIGGER update_forum_replies_updated_at
  BEFORE UPDATE ON public.forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_categories_updated_at ON public.store_categories;
CREATE TRIGGER update_store_categories_updated_at
  BEFORE UPDATE ON public.store_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_packages_updated_at ON public.store_packages;
CREATE TRIGGER update_store_packages_updated_at
  BEFORE UPDATE ON public.store_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_discounts_updated_at ON public.discounts;
CREATE TRIGGER update_discounts_updated_at
  BEFORE UPDATE ON public.discounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
