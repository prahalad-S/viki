-- ============================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ============================================================

-- This script finds any users in the authentication system that are missing 
-- a profile (because they signed up before the trigger was fully set up) 
-- and creates their profile for them, correctly assigning the 'admin' role!

INSERT INTO public.profiles (id, email, display_name, avatar_url, role)
SELECT 
  id, 
  email, 
  raw_user_meta_data->>'full_name', 
  raw_user_meta_data->>'avatar_url',
  CASE WHEN lower(email) = 'aliaswave7@gmail.com' THEN 'admin' ELSE 'user' END
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
