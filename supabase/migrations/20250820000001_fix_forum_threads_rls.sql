-- Fix forum threads RLS policies to allow public access temporarily
-- This fixes the 406 errors when loading forum data

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view threads" ON public.forum_threads;
DROP POLICY IF EXISTS "Users can create threads" ON public.forum_threads;
DROP POLICY IF EXISTS "Authors can update own threads" ON public.forum_threads;

-- Create simpler policies that allow public read access
CREATE POLICY "Public can view all threads"
ON public.forum_threads
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create threads"
ON public.forum_threads
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

CREATE POLICY "Authors and moderators can update threads"
ON public.forum_threads
FOR UPDATE
USING (auth.uid() = author_id OR public.is_moderator_or_above(auth.uid()))
WITH CHECK (auth.uid() = author_id OR public.is_moderator_or_above(auth.uid()));

CREATE POLICY "Moderators can delete threads"
ON public.forum_threads
FOR DELETE
USING (public.is_moderator_or_above(auth.uid()));
