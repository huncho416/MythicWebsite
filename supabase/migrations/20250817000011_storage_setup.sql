-- Storage setup for package images and avatars

-- Storage policies (buckets need to be created manually in Supabase Dashboard)
-- Create the following buckets in your Supabase Dashboard:
-- 1. 'package-images' (public)
-- 2. 'avatars' (public)

-- Enable RLS on storage.objects if not already enabled
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Package images policies
DROP POLICY IF EXISTS "Package images are publicly accessible" ON storage.objects;
-- CREATE POLICY "Package images are publicly accessible"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'package-images');

-- Avatar policies  
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
-- CREATE POLICY "Avatars are publicly accessible"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'avatars');

-- Note: Additional storage policies should be created via Supabase Dashboard
