-- Auto-create user profiles when users sign up
-- This ensures every authenticated user has a profile

-- Function to auto-create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, username, display_name, join_date)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also handle the case where username might be taken - add a suffix if needed
CREATE OR REPLACE FUNCTION public.ensure_unique_username(base_username text, user_id uuid)
RETURNS text AS $$
DECLARE
  username_candidate text;
  counter integer := 1;
BEGIN
  username_candidate := base_username;
  
  -- Check if the username already exists for a different user
  WHILE EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE username = username_candidate 
    AND user_id != ensure_unique_username.user_id
  ) LOOP
    username_candidate := base_username || counter::text;
    counter := counter + 1;
  END LOOP;
  
  RETURN username_candidate;
END;
$$ LANGUAGE plpgsql;
