create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  height_cm numeric not null,
  weight_kg numeric not null,
  gender text not null check (gender in ('female', 'male', 'other')),
  age integer check (age is null or age between 1 and 120),
  avatar_url text,
  front_photo_url text,
  side_photo_url text,
  created_at timestamptz not null default now()
);

alter table public.users
add column if not exists front_photo_url text,
add column if not exists side_photo_url text;

alter table public.users enable row level security;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('body-photos', 'body-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Allow anonymous profile inserts" on public.users;
drop policy if exists "Allow anonymous profile reads" on public.users;
drop policy if exists "Allow anonymous profile photo updates" on public.users;
drop policy if exists "Allow anonymous avatar uploads" on storage.objects;
drop policy if exists "Allow anonymous body photo uploads" on storage.objects;
drop policy if exists "Allow public avatar reads" on storage.objects;
drop policy if exists "Allow public body photo reads" on storage.objects;

create policy "Allow anonymous profile inserts"
on public.users
for insert
to anon
with check (true);

create policy "Allow anonymous profile reads"
on public.users
for select
to anon
using (true);

create policy "Allow anonymous profile photo updates"
on public.users
for update
to anon
using (true)
with check (true);

create policy "Allow anonymous avatar uploads"
on storage.objects
for insert
to anon
with check (bucket_id = 'avatars');

create policy "Allow anonymous body photo uploads"
on storage.objects
for insert
to anon
with check (bucket_id = 'body-photos');

create policy "Allow public avatar reads"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'avatars');

create policy "Allow public body photo reads"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'body-photos');
