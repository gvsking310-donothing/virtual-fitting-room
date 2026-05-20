create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  height_cm numeric not null,
  weight_kg numeric not null,
  gender text not null check (gender in ('female', 'male', 'other')),
  age integer check (age is null or age between 1 and 120),
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

create policy "Allow anonymous profile inserts"
on public.users
for insert
to anon
with check (true);

create policy "Allow anonymous avatar uploads"
on storage.objects
for insert
to anon
with check (bucket_id = 'avatars');

create policy "Allow public avatar reads"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'avatars');
