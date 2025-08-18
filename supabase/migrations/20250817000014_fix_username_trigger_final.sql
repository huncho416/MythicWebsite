-- Comprehensive fix for the username registration bug
-- This ensures the username from signup is always used correctly

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a new, more robust function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  desired_username text;
  final_username text;
  username_counter integer := 1;
BEGIN
  -- Get the desired username from metadata, with fallbacks
  desired_username := COALESCE(
    NEW.raw_user_meta_data->>'preferred_username',
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Ensure we have a username
  IF desired_username IS NULL OR desired_username = '' THEN
    desired_username := split_part(NEW.email, '@', 1);
  END IF;
  
  -- Make sure username is unique
  final_username := desired_username;
  WHILE EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE username = final_username 
    AND user_id != NEW.id
  ) LOOP
    final_username := desired_username || username_counter::text;
    username_counter := username_counter + 1;
  END LOOP;

  -- Insert the profile (only if it doesn't already exist)
  INSERT INTO public.user_profiles (user_id, username, join_date)
  VALUES (
    NEW.id,
    final_username,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
