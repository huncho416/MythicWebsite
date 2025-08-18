-- Add home page messages/announcements table
-- This migration adds the structure for managing home page content

-- Home page messages/announcements
CREATE TABLE IF NOT EXISTS public.home_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_published boolean DEFAULT false,
  allow_comments boolean DEFAULT true,
  view_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Home message comments
CREATE TABLE IF NOT EXISTS public.home_message_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  message_id uuid NOT NULL REFERENCES public.home_messages(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.home_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_message_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for home_messages
DROP POLICY IF EXISTS "Anyone can view published messages" ON public.home_messages;
CREATE POLICY "Anyone can view published messages"
ON public.home_messages
FOR SELECT
TO authenticated
USING (is_published = true);

DROP POLICY IF EXISTS "Admins can view all messages" ON public.home_messages;
CREATE POLICY "Admins can view all messages"
ON public.home_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('owner', 'system_admin', 'senior_admin', 'admin')
  )
);

DROP POLICY IF EXISTS "Admins can manage messages" ON public.home_messages;
CREATE POLICY "Admins can manage messages"
ON public.home_messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('owner', 'system_admin', 'senior_admin', 'admin')
  )
);

-- RLS policies for home_message_comments
DROP POLICY IF EXISTS "Anyone can view approved comments" ON public.home_message_comments;
CREATE POLICY "Anyone can view approved comments"
ON public.home_message_comments
FOR SELECT
TO authenticated
USING (is_approved = true);

DROP POLICY IF EXISTS "Admins can view all comments" ON public.home_message_comments;
CREATE POLICY "Admins can view all comments"
ON public.home_message_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('owner', 'system_admin', 'senior_admin', 'admin', 'senior_moderator', 'moderator')
  )
);

DROP POLICY IF EXISTS "Users can create comments if allowed" ON public.home_message_comments;
CREATE POLICY "Users can create comments if allowed"
ON public.home_message_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.home_messages hm
    WHERE hm.id = message_id 
    AND hm.is_published = true
    AND hm.allow_comments = true
  )
);

DROP POLICY IF EXISTS "Authors can update their comments" ON public.home_message_comments;
CREATE POLICY "Authors can update their comments"
ON public.home_message_comments
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Moderators can manage comments" ON public.home_message_comments;
CREATE POLICY "Moderators can manage comments"
ON public.home_message_comments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('owner', 'system_admin', 'senior_admin', 'admin', 'senior_moderator', 'moderator')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_home_messages_published_at ON public.home_messages(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_home_messages_author_id ON public.home_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_home_messages_is_published ON public.home_messages(is_published);

CREATE INDEX IF NOT EXISTS idx_home_message_comments_message_id ON public.home_message_comments(message_id);
CREATE INDEX IF NOT EXISTS idx_home_message_comments_author_id ON public.home_message_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_home_message_comments_created_at ON public.home_message_comments(created_at DESC);

-- Create function to update comment count
CREATE OR REPLACE FUNCTION public.update_message_comment_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.home_messages 
    SET comment_count = comment_count + 1
    WHERE id = NEW.message_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.home_messages 
    SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = OLD.message_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_message_comment_stats_on_insert ON public.home_message_comments;
CREATE TRIGGER update_message_comment_stats_on_insert
  AFTER INSERT ON public.home_message_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_message_comment_stats();

DROP TRIGGER IF EXISTS update_message_comment_stats_on_delete ON public.home_message_comments;
CREATE TRIGGER update_message_comment_stats_on_delete
  AFTER DELETE ON public.home_message_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_message_comment_stats();

-- Add update triggers for timestamps
DROP TRIGGER IF EXISTS update_home_messages_updated_at ON public.home_messages;
CREATE TRIGGER update_home_messages_updated_at
  BEFORE UPDATE ON public.home_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_home_message_comments_updated_at ON public.home_message_comments;
CREATE TRIGGER update_home_message_comments_updated_at
  BEFORE UPDATE ON public.home_message_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert some default messages
INSERT INTO public.home_messages (title, content, image_url, author_id, is_published, published_at) VALUES
('Welcome to MythicPvP!', 'Welcome to our amazing Minecraft server! Enjoy your stay and have fun playing with our community. Check out our store for awesome ranks and perks!', '/lovable-uploads/1100660f-b312-47b5-b534-6226348431dd.png', (SELECT id FROM auth.users LIMIT 1), true, now()),
('Server Updates', 'We have just released a major update with new features, bug fixes, and improvements. Check out the changelog for more details about what''s new!', '/lovable-uploads/1100660f-b312-47b5-b534-6226348431dd.png', (SELECT id FROM auth.users LIMIT 1), true, now())
ON CONFLICT DO NOTHING;
