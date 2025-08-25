-- Add is_important column to forum_threads and create forum tag management system
-- This migration adds support for customizable forum thread tags

-- Add is_important column to forum_threads
ALTER TABLE public.forum_threads 
ADD COLUMN IF NOT EXISTS is_important boolean DEFAULT false;

-- Create forum_thread_tags table for custom tag management
CREATE TABLE IF NOT EXISTS public.forum_thread_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text NOT NULL DEFAULT '#6366f1',
  icon text,
  is_system boolean DEFAULT false, -- true for pinned, locked, important
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create junction table for thread-tag relationships
CREATE TABLE IF NOT EXISTS public.forum_thread_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.forum_thread_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(thread_id, tag_id)
);

-- Insert default system tags
INSERT INTO public.forum_thread_tags (name, description, color, icon, is_system) VALUES
  ('pinned', 'Pinned to top of category', '#f59e0b', '📌', true),
  ('locked', 'No new replies allowed', '#ef4444', '🔒', true),
  ('important', 'Important thread', '#dc2626', '❗', true)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.forum_thread_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_thread_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for forum_thread_tags
DROP POLICY IF EXISTS "Anyone can view tags" ON public.forum_thread_tags;
CREATE POLICY "Anyone can view tags"
ON public.forum_thread_tags
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage tags" ON public.forum_thread_tags;
CREATE POLICY "Admins can manage tags"
ON public.forum_thread_tags
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'moderator', 'senior_admin', 'system_admin', 'owner')
  )
);

-- RLS policies for forum_thread_tag_assignments
DROP POLICY IF EXISTS "Anyone can view tag assignments" ON public.forum_thread_tag_assignments;
CREATE POLICY "Anyone can view tag assignments"
ON public.forum_thread_tag_assignments
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage tag assignments" ON public.forum_thread_tag_assignments;
CREATE POLICY "Admins can manage tag assignments"
ON public.forum_thread_tag_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'moderator', 'senior_admin', 'system_admin', 'owner')
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_thread_tag_assignments_thread_id ON public.forum_thread_tag_assignments(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_thread_tag_assignments_tag_id ON public.forum_thread_tag_assignments(tag_id);
