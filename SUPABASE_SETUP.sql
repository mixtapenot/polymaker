-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create market_ideas table
create table public.market_ideas (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  image_url text,
  resolution_criteria text not null, -- "Date: 2024-01-01" or "Event: When X happens"
  resolution_type text not null check (resolution_type in ('date', 'event')),
  resolution_date timestamp with time zone, -- Optional, if type is date
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  score integer default 0 not null
);

-- Create market_options table
create table public.market_options (
  id uuid default uuid_generate_v4() primary key,
  market_id uuid references public.market_ideas(id) on delete cascade not null,
  name text not null
);

-- Create votes table
create table public.votes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  market_id uuid references public.market_ideas(id) on delete cascade not null,
  vote_type integer not null check (vote_type in (1, -1)), -- 1 for up, -1 for down
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, market_id)
);

-- RLS Policies

-- Profiles
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Market Ideas
alter table public.market_ideas enable row level security;
create policy "Markets are viewable by everyone" on public.market_ideas for select using (true);
create policy "Authenticated users can create markets" on public.market_ideas for insert with check (auth.role() = 'authenticated');
create policy "Creators can update their markets" on public.market_ideas for update using (auth.uid() = creator_id);

-- Market Options
alter table public.market_options enable row level security;
create policy "Options are viewable by everyone" on public.market_options for select using (true);
create policy "Authenticated users can create options" on public.market_options for insert with check (auth.role() = 'authenticated');

-- Votes
alter table public.votes enable row level security;
create policy "Votes are viewable by everyone" on public.votes for select using (true);
create policy "Authenticated users can vote" on public.votes for insert with check (auth.role() = 'authenticated');
create policy "Users can update their own vote" on public.votes for update using (auth.uid() = user_id);
create policy "Users can delete their own vote" on public.votes for delete using (auth.uid() = user_id);

-- Functions & Triggers

-- Handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update market score on vote
create or replace function public.handle_vote()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.market_ideas
    set score = score + new.vote_type
    where id = new.market_id;
  elsif (TG_OP = 'DELETE') then
    update public.market_ideas
    set score = score - old.vote_type
    where id = old.market_id;
  elsif (TG_OP = 'UPDATE') then
    update public.market_ideas
    set score = score - old.vote_type + new.vote_type
    where id = new.market_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_vote_change
  after insert or update or delete on public.votes
  for each row execute procedure public.handle_vote();
