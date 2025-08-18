-- Comprehensive fix for registration username bug
-- This migration ensures the username from registration is always used correctly

-- First, drop the existing function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate the function with improved logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  desired_username text;
  final_username text;
BEGIN
  -- Get the username from user metadata, fallback to email username
  desired_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  
  -- Ensure we have a clean username (no special characters, lowercase)
  desired_username := lower(regexp_replace(desired_username, '[^a-zA-Z0-9_]', '', 'g'));
  
  -- Make sure username is not empty
  IF desired_username = '' OR desired_username IS NULL THEN
    desired_username := split_part(NEW.email, '@', 1);
  END IF;
  
  -- Use the ensure_unique_username function to handle duplicates
  final_username := public.ensure_unique_username(desired_username, NEW.id);
  
  -- Insert the user profile with the correct username
  INSERT INTO public.user_profiles (user_id, username, join_date)
  VALUES (
    NEW.id,
    final_username,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    join_date = EXCLUDED.join_date;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also create a function to fix existing users with wrong usernames
CREATE OR REPLACE FUNCTION public.fix_existing_usernames()
RETURNS void AS $$
DECLARE
  user_record record;
  correct_username text;
BEGIN
  -- Find users whose profile username doesn't match their signup username
  FOR user_record IN 
    SELECT 
      au.id,
      au.email,
      au.raw_user_meta_data,
      up.username as current_username
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON up.user_id = au.id
    WHERE au.raw_user_meta_data->>'username' IS NOT NULL
      AND up.username != au.raw_user_meta_data->>'username'
  LOOP
    -- Get the correct username from metadata
    correct_username := user_record.raw_user_meta_data->>'username';
    
    -- Update the profile with the correct username if it's available
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE username = correct_username 
      AND user_id != user_record.id
    ) THEN
      UPDATE public.user_profiles 
      SET username = correct_username
      WHERE user_id = user_record.id;
      
      RAISE NOTICE 'Updated username for user % from % to %', 
        user_record.email, user_record.current_username, correct_username;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Uncomment the line below to fix existing users (run manually when needed)
-- SELECT public.fix_existing_usernames();
