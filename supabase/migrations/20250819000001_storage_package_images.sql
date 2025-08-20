-- Create storage bucket for package images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'package-images',
  'package-images', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
CREATE POLICY "Anyone can view package images" ON storage.objects
FOR SELECT USING (bucket_id = 'package-images');

CREATE POLICY "Admins can upload package images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'package-images' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('owner', 'system_admin', 'senior_admin', 'admin')
  )
);

CREATE POLICY "Admins can update package images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'package-images' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('owner', 'system_admin', 'senior_admin', 'admin')
  )
);

CREATE POLICY "Admins can delete package images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'package-images' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('owner', 'system_admin', 'senior_admin', 'admin')
  )
);
