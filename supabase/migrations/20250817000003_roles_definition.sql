-- Add a proper roles definition table
-- This migration adds a table to define custom roles with permissions

-- Create roles definition table
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text DEFAULT '#ffffff',
  prefix text,
  priority integer DEFAULT 0,
  permissions jsonb DEFAULT '{}',
  is_system_role boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Anyone can view roles" ON public.roles;
CREATE POLICY "Anyone can view roles"
ON public.roles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;
CREATE POLICY "Admins can manage roles"
ON public.roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('owner', 'system_admin', 'senior_admin', 'admin')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_roles_priority ON public.roles(priority DESC);
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);

-- Update function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_roles_updated_at ON public.roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default roles
INSERT INTO public.roles (name, description, color, prefix, priority, permissions, is_system_role) VALUES
('Owner', 'Server owner with full access', '#ff0000', '[OWNER]', 100, '{"admin_access": true, "manage_users": true, "manage_forums": true, "manage_store": true, "manage_support": true, "moderate_content": true, "view_admin_logs": true, "manage_roles": true}', true),
('System Admin', 'System administrator with nearly full access', '#ff6600', '[SYS-ADMIN]', 90, '{"admin_access": true, "manage_users": true, "manage_forums": true, "manage_store": true, "manage_support": true, "moderate_content": true, "view_admin_logs": true, "manage_roles": false}', true),
('Senior Admin', 'Senior administrator', '#ffaa00', '[SR-ADMIN]', 80, '{"admin_access": true, "manage_users": true, "manage_forums": true, "manage_store": true, "manage_support": true, "moderate_content": true, "view_admin_logs": true, "manage_roles": false}', true),
('Admin', 'Administrator', '#ffdd00', '[ADMIN]', 70, '{"admin_access": true, "manage_users": true, "manage_forums": true, "manage_store": false, "manage_support": true, "moderate_content": true, "view_admin_logs": false, "manage_roles": false}', true),
('Senior Moderator', 'Senior moderator', '#00aa00', '[SR-MOD]', 60, '{"admin_access": false, "manage_users": false, "manage_forums": true, "manage_store": false, "manage_support": true, "moderate_content": true, "view_admin_logs": false, "manage_roles": false}', true),
('Moderator', 'Forum and chat moderator', '#00dd00', '[MOD]', 50, '{"admin_access": false, "manage_users": false, "manage_forums": false, "manage_store": false, "manage_support": true, "moderate_content": true, "view_admin_logs": false, "manage_roles": false}', true),
('Helper', 'Support helper', '#0066ff', '[HELPER]', 40, '{"admin_access": false, "manage_users": false, "manage_forums": false, "manage_store": false, "manage_support": true, "moderate_content": false, "view_admin_logs": false, "manage_roles": false}', true),
('Developer', 'Developer with special permissions', '#9900ff', '[DEV]', 30, '{"admin_access": true, "manage_users": false, "manage_forums": false, "manage_store": false, "manage_support": false, "moderate_content": false, "view_admin_logs": true, "manage_roles": false}', true),
('VIP', 'VIP member', '#ffff00', '[VIP]', 20, '{}', false),
('Member', 'Regular member', '#ffffff', '', 10, '{}', false)
ON CONFLICT (name) DO NOTHING;
