-- Fix the auto-create user profile function to properly use the username from registration
-- Remove display_name usage and ensure username from signup is respected

-- Updated function to auto-create user profile without display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, username, join_date)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger is already created, so we don't need to recreate it
-- It will now use the updated function above
