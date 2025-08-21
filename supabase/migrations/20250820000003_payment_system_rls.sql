-- RLS Policies for Enhanced Payment System

-- Payment Configurations Policies
DROP POLICY IF EXISTS "Admins can manage payment configurations" ON public.payment_configurations;
CREATE POLICY "Admins can manage payment configurations"
ON public.payment_configurations
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- Order Items Policies
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
ON public.order_items
FOR SELECT
USING (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "System can manage order items" ON public.order_items;
CREATE POLICY "System can manage order items"
ON public.order_items
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- Payment Logs Policies
DROP POLICY IF EXISTS "Admins can view payment logs" ON public.payment_logs;
CREATE POLICY "Admins can view payment logs"
ON public.payment_logs
FOR SELECT
USING (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "System can manage payment logs" ON public.payment_logs;
CREATE POLICY "System can manage payment logs"
ON public.payment_logs
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- Command Execution Logs Policies
DROP POLICY IF EXISTS "Users can view own command logs" ON public.command_execution_logs;
CREATE POLICY "Users can view own command logs"
ON public.command_execution_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = command_execution_logs.order_id
    AND orders.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view all command logs" ON public.command_execution_logs;
CREATE POLICY "Admins can view all command logs"
ON public.command_execution_logs
FOR SELECT
USING (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "System can manage command logs" ON public.command_execution_logs;
CREATE POLICY "System can manage command logs"
ON public.command_execution_logs
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- Store Categories Policies (simplified for now)
DROP POLICY IF EXISTS "Anyone can view visible categories" ON public.store_categories;
CREATE POLICY "Anyone can view visible categories"
ON public.store_categories
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.store_categories;
CREATE POLICY "Admins can manage categories"
ON public.store_categories
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));
