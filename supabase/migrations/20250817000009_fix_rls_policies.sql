-- Fix role checking functions and RLS policies

-- Update the has_role function to work with text roles instead of enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  );
$$;

-- Ensure user profiles can be read by admins
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    profile_visibility = 'public' 
    OR user_id = auth.uid()
    OR public.is_admin_or_above(auth.uid())
  )
);

-- Add policy for user_roles table
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.is_admin_or_above(auth.uid())
);

-- Allow admins to manage user roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
USING (public.is_admin_or_above(auth.uid()))
WITH CHECK (public.is_admin_or_above(auth.uid()));

-- Add insert policy for user_profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update user profiles policy for updates
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin_or_above(auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_admin_or_above(auth.uid()));
