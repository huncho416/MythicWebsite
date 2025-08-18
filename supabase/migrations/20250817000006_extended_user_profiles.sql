-- Add additional profile fields
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS discord_username TEXT,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
ADD COLUMN IF NOT EXISTS show_online_status BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_friend_requests BOOLEAN DEFAULT true;

-- Update RLS policies to include new fields
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" 
ON user_profiles FOR SELECT 
USING (user_id = auth.uid() OR profile_visibility = 'public');

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" 
ON user_profiles FOR UPDATE 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile" 
ON user_profiles FOR INSERT 
WITH CHECK (user_id = auth.uid());
