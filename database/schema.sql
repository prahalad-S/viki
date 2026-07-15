-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Drop existing tables/functions to allow clean re-runs
drop table if exists public.messages cascade;
drop table if exists public.chats cascade;
drop table if exists public.profiles cascade;
drop function if exists public.handle_new_user cascade;
drop function if exists public.handle_updated_at cascade;

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  email text,
  is_blocked boolean default false,
  role text default 'user',
  tokens_used integer default 0,
  tokens_left integer default 10000,
  last_seen timestamp with time zone,
  ip_address text,
  country text,
  state text,
  display_name text,
  avatar_url text,
  writing_style text,
  system_prompt text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Chats table
create table public.chats (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New Chat',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Messages table
create table public.messages (
  id uuid not null default gen_random_uuid(),
  chat_id uuid not null references public.chats on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant', 'data')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Set up Row Level Security (RLS)

alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- Enable realtime for chats table
alter publication supabase_realtime add table public.chats;

-- Profiles Policies
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Chats Policies
create policy "Users can view their own chats."
  on chats for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own chats."
  on chats for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own chats."
  on chats for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own chats."
  on chats for delete
  using ( auth.uid() = user_id );

-- Messages Policies
create policy "Users can view messages of their chats."
  on messages for select
  using ( exists (select 1 from chats where chats.id = messages.chat_id and chats.user_id = auth.uid()) );

create policy "Users can insert messages to their chats."
  on messages for insert
  with check ( exists (select 1 from chats where chats.id = messages.chat_id and chats.user_id = auth.uid()) );

create policy "Users can update messages of their chats."
  on messages for update
  using ( exists (select 1 from chats where chats.id = messages.chat_id and chats.user_id = auth.uid()) );

create policy "Users can delete messages of their chats."
  on messages for delete
  using ( exists (select 1 from chats where chats.id = messages.chat_id and chats.user_id = auth.uid()) );

-- Trigger for updated_at on profiles
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

create trigger handle_chats_updated_at
  before update on public.chats
  for each row
  execute function public.handle_updated_at();

-- Trigger to automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_admin boolean;
begin
  is_admin := lower(new.email) = 'aliaswave7@gmail.com';
  
  insert into public.profiles (id, email, display_name, avatar_url, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    case when is_admin then 'admin' else 'user' end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
