-- ============================================================
-- INCREMENTAL PATCH — run this in Supabase SQL Editor
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- 1. Add tokens_left column to profiles (missing from original schema)
alter table public.profiles
  add column if not exists tokens_left integer default 10000;

-- Backfill existing rows that have NULL tokens_left
update public.profiles
set tokens_left = 10000
where tokens_left is null;

-- 2. Realtime for chats is already enabled.

-- 3. Grant the anon / authenticated roles access to read realtime events
--    (needed for postgres_changes subscriptions from the browser)
grant select on public.chats to authenticated;
grant select on public.chats to anon;

-- ============================================================
-- VERIFY: run these to check everything is in order
-- ============================================================
-- select column_name, data_type, column_default
--   from information_schema.columns
--   where table_name = 'profiles' and column_name = 'tokens_left';

-- select schemaname, tablename
--   from pg_publication_tables
--   where pubname = 'supabase_realtime';
