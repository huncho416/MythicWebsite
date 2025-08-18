-- Add foreign key relationships for user profiles in forum tables

-- First, ensure all users have profiles
INSERT INTO public.user_profiles (user_id, username, display_name)
SELECT id, email, email
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Add views for easier querying
CREATE OR REPLACE VIEW forum_threads_with_authors AS
SELECT 
  ft.*,
  up.display_name as author_display_name,
  up.username as author_username,
  up.avatar_url as author_avatar_url,
  up.minecraft_username as author_minecraft_username,
  up.gender as author_gender,
  up.birthday as author_birthday,
  up.location as author_location,
  up.join_date as author_join_date,
  up.last_seen as author_last_seen
FROM public.forum_threads ft
LEFT JOIN public.user_profiles up ON ft.author_id = up.user_id;

CREATE OR REPLACE VIEW forum_posts_with_authors AS
SELECT 
  fp.*,
  up.display_name as author_display_name,
  up.username as author_username,
  up.avatar_url as author_avatar_url,
  up.minecraft_username as author_minecraft_username,
  up.gender as author_gender,
  up.birthday as author_birthday,
  up.location as author_location,
  up.join_date as author_join_date,
  up.last_seen as author_last_seen
FROM public.forum_posts fp
LEFT JOIN public.user_profiles up ON fp.author_id = up.user_id;

-- Grant permissions on views
GRANT SELECT ON forum_threads_with_authors TO authenticated;
GRANT SELECT ON forum_posts_with_authors TO authenticated;
