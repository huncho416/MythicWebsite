-- Seed Owner role for provided email
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'owner'::public.app_role
FROM auth.users u
WHERE lower(u.email) = lower('xxxgaming4@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;