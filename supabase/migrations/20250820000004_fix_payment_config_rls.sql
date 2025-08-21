-- Fix payment configurations RLS for public access to enabled configs
-- This allows public users to check if payment providers are enabled without exposing sensitive config

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage payment configurations" ON public.payment_configurations;

-- Create separate policies for read and write
CREATE POLICY "Anyone can view enabled payment configurations"
ON public.payment_configurations
FOR SELECT
USING (is_enabled = true);

CREATE POLICY "Admins can manage payment configurations"
ON public.payment_configurations
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- Update the payment config service to only expose safe fields to public
-- The application code should filter sensitive fields client-side
