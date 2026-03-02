-- Backfill missing profiles from auth.users
-- Run this if you get "violates foreign key constraint" errors

insert into public.profiles (id, email, full_name, avatar_url)
select 
  id, 
  email, 
  raw_user_meta_data->>'full_name', 
  raw_user_meta_data->>'avatar_url'
from auth.users
where id not in (select id from public.profiles);
