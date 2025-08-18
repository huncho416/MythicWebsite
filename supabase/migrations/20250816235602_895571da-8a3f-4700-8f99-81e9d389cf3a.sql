-- 1) Create enum for app roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'owner',
    'system_admin',
    'senior_admin',
    'admin',
    'senior_moderator',
    'moderator',
    'helper',
    'developer'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3) Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4) Helper function to check if a user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 5) Policies
-- Users can view their own roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins and above can view all roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'senior_admin')
  OR public.has_role(auth.uid(), 'system_admin')
  OR public.has_role(auth.uid(), 'owner')
);

-- Admins and above can insert roles
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'senior_admin')
  OR public.has_role(auth.uid(), 'system_admin')
  OR public.has_role(auth.uid(), 'owner')
);

-- Admins and above can update roles
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'senior_admin')
  OR public.has_role(auth.uid(), 'system_admin')
  OR public.has_role(auth.uid(), 'owner')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'senior_admin')
  OR public.has_role(auth.uid(), 'system_admin')
  OR public.has_role(auth.uid(), 'owner')
);

-- Admins and above can delete roles
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'senior_admin')
  OR public.has_role(auth.uid(), 'system_admin')
  OR public.has_role(auth.uid(), 'owner')
);

-- 6) Index for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);