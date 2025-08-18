-- Add forum threads and posts tables
-- This migration adds the structure for forum discussions

-- Forum threads table
CREATE TABLE IF NOT EXISTS public.forum_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category_id uuid NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  view_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  last_reply_at timestamptz,
  last_reply_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Forum posts (replies to threads)
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  thread_id uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reply_to_id uuid REFERENCES public.forum_posts(id),
  is_edited boolean DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for forum_threads
DROP POLICY IF EXISTS "Anyone can view threads" ON public.forum_threads;
CREATE POLICY "Anyone can view threads"
ON public.forum_threads
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can create threads if category allows" ON public.forum_threads;
CREATE POLICY "Users can create threads if category allows"
ON public.forum_threads
FOR INSERT
TO authenticated
WITH CHECK (
  -- Check if category allows thread creation and user is authenticated
  EXISTS (
    SELECT 1 FROM public.forum_categories fc 
    WHERE fc.id = category_id 
    AND NOT fc.is_locked
  )
);

DROP POLICY IF EXISTS "Authors can update their threads" ON public.forum_threads;
CREATE POLICY "Authors can update their threads"
ON public.forum_threads
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Moderators can manage threads" ON public.forum_threads;
CREATE POLICY "Moderators can manage threads"
ON public.forum_threads
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('owner', 'system_admin', 'senior_admin', 'admin', 'senior_moderator', 'moderator')
  )
);

-- RLS policies for forum_posts
DROP POLICY IF EXISTS "Anyone can view posts" ON public.forum_posts;
CREATE POLICY "Anyone can view posts"
ON public.forum_posts
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can create posts if thread/category allows" ON public.forum_posts;
CREATE POLICY "Users can create posts if thread/category allows"
ON public.forum_posts
FOR INSERT
TO authenticated
WITH CHECK (
  -- Check if thread and category allow posting
  EXISTS (
    SELECT 1 FROM public.forum_threads ft
    JOIN public.forum_categories fc ON ft.category_id = fc.id
    WHERE ft.id = thread_id 
    AND NOT ft.is_locked
    AND NOT fc.is_locked
  )
);

DROP POLICY IF EXISTS "Authors can update their posts" ON public.forum_posts;
CREATE POLICY "Authors can update their posts"
ON public.forum_posts
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Moderators can manage posts" ON public.forum_posts;
CREATE POLICY "Moderators can manage posts"
ON public.forum_posts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('owner', 'system_admin', 'senior_admin', 'admin', 'senior_moderator', 'moderator')
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_threads_category_id ON public.forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_author_id ON public.forum_threads(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_created_at ON public.forum_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_last_reply_at ON public.forum_threads(last_reply_at DESC);

CREATE INDEX IF NOT EXISTS idx_forum_posts_thread_id ON public.forum_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author_id ON public.forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON public.forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_reply_to_id ON public.forum_posts(reply_to_id);

-- Create triggers to update thread stats
CREATE OR REPLACE FUNCTION public.update_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment reply count and update last reply info
    UPDATE public.forum_threads 
    SET 
      reply_count = reply_count + 1,
      last_reply_at = NEW.created_at,
      last_reply_by = NEW.author_id,
      updated_at = now()
    WHERE id = NEW.thread_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement reply count
    UPDATE public.forum_threads 
    SET 
      reply_count = GREATEST(0, reply_count - 1),
      updated_at = now()
    WHERE id = OLD.thread_id;
    
    -- Update last reply info if this was the last reply
    UPDATE public.forum_threads 
    SET 
      last_reply_at = (
        SELECT created_at FROM public.forum_posts 
        WHERE thread_id = OLD.thread_id 
        ORDER BY created_at DESC 
        LIMIT 1
      ),
      last_reply_by = (
        SELECT author_id FROM public.forum_posts 
        WHERE thread_id = OLD.thread_id 
        ORDER BY created_at DESC 
        LIMIT 1
      )
    WHERE id = OLD.thread_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_thread_stats_on_post_insert ON public.forum_posts;
CREATE TRIGGER update_thread_stats_on_post_insert
  AFTER INSERT ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_thread_stats();

DROP TRIGGER IF EXISTS update_thread_stats_on_post_delete ON public.forum_posts;
CREATE TRIGGER update_thread_stats_on_post_delete
  AFTER DELETE ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_thread_stats();

-- Add update triggers for timestamps
DROP TRIGGER IF EXISTS update_forum_threads_updated_at ON public.forum_threads;
CREATE TRIGGER update_forum_threads_updated_at
  BEFORE UPDATE ON public.forum_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_forum_posts_updated_at ON public.forum_posts;
CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
