-- ============================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ============================================================

-- This will give your user account the 'admin' role so you can see the dashboard.
-- Note: This makes everyone an admin. If you only want to make your specific email an admin, use:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';

UPDATE public.profiles SET role = 'admin';
