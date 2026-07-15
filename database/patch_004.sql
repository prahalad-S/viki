-- ============================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ============================================================

-- 1. Reset everyone to 'user' role
UPDATE public.profiles SET role = 'user';

-- 2. Give the 'admin' role ONLY to your email (Case-Insensitive)
-- This fixes the issue if Google returned your email with a capital letter (e.g., Aliaswave7@...)
UPDATE public.profiles SET role = 'admin' WHERE email ILIKE 'aliaswave7@gmail.com';

-- 3. Restore the trigger with a case-insensitive check
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Strict, but case-insensitive check for your admin email
  is_admin := lower(new.email) = 'aliaswave7@gmail.com';
  
  INSERT INTO public.profiles (id, email, display_name, avatar_url, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    CASE WHEN is_admin THEN 'admin' ELSE 'user' END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
