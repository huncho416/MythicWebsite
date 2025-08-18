-- SQL script to update existing home message images
-- Run this in your Supabase SQL editor to fix the banner images

UPDATE public.home_messages 
SET image_url = '/banner.jpg' 
WHERE image_url LIKE '/lovable-uploads/%';

-- Verify the update
SELECT id, title, image_url, created_at 
FROM public.home_messages 
ORDER BY created_at DESC;
