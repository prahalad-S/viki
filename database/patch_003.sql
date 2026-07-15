-- ============================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ============================================================

-- 1. Upgrade ALL existing users to admin
UPDATE public.profiles SET role = 'admin';

-- 2. Update the trigger so that any NEW users who sign in via Google 
--    (or anything else) automatically become admins during local development.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'admin' -- hardcoded to admin for local development
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
