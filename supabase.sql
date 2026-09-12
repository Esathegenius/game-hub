-- Run this entire file in Supabase SQL Editor.

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.games (
  id uuid primary key,
  name text not null,
  description text not null,
  version text not null default '1.0.0',
  zip_path text not null,
  image_path text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
alter table public.games enable row level security;

-- Anyone can see the public game catalogue.
create policy "Public can read games"
on public.games for select
to anon, authenticated
using (true);

-- Only admins can create/update/delete games.
create policy "Admins can insert games"
on public.games for insert
to authenticated
with check (
  exists (select 1 from public.admins where user_id = auth.uid())
  and created_by = auth.uid()
);

create policy "Admins can delete games"
on public.games for delete
to authenticated
using (
  exists (select 1 from public.admins where user_id = auth.uid())
);

create policy "Admins can update games"
on public.games for update
to authenticated
using (
  exists (select 1 from public.admins where user_id = auth.uid())
)
with check (
  exists (select 1 from public.admins where user_id = auth.uid())
);

-- Admins may check their own admin row.
create policy "Admins can read own admin row"
on public.admins for select
to authenticated
using (user_id = auth.uid());

-- Storage buckets.
insert into storage.buckets (id, name, public)
values ('game-zips', 'game-zips', true),
       ('game-images', 'game-images', true)
on conflict (id) do nothing;

-- Public downloads.
create policy "Public can download game zips"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'game-zips');

create policy "Public can view game images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'game-images');

-- Only admins can upload/delete files.
create policy "Admins can upload game zips"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'game-zips'
  and exists (select 1 from public.admins where user_id = auth.uid())
);

create policy "Admins can delete game zips"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'game-zips'
  and exists (select 1 from public.admins where user_id = auth.uid())
);

create policy "Admins can upload game images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'game-images'
  and exists (select 1 from public.admins where user_id = auth.uid())
);

create policy "Admins can delete game images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'game-images'
  and exists (select 1 from public.admins where user_id = auth.uid())
);

-- IMPORTANT:
-- After creating your account in Authentication > Users, run:
--
-- insert into public.admins (user_id)
-- values ('YOUR-AUTH-USER-UUID-HERE');
--
-- Do NOT put a service-role key in your website.
