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

create table if not exists public.clothes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (
    category in ('上衣', '裤子', '裙子', '外套', '鞋子', '帽子', '包包', '首饰')
  ),
  brand text,
  image_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.try_on_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  clothing_id uuid references public.clothes(id),
  user_photo_url text not null,
  clothing_image_url text not null,
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'done', 'failed')
  ),
  result_image_url text,
  error_message text,
  provider text,
  actual_provider text,
  provider_fallback_reason text,
  provider_was_queued boolean not null default false,
  generation_progress integer not null default 0,
  generation_phase text,
  generation_started_at timestamptz,
  generation_completed_at timestamptz,
  generation_duration_seconds integer,
  provider_retry_count integer not null default 0,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.outfit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  name text not null default '我的穿搭',
  top_id uuid references public.clothes(id),
  pants_id uuid references public.clothes(id),
  shoes_id uuid references public.clothes(id),
  hat_id uuid references public.clothes(id),
  bag_id uuid references public.clothes(id),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.users
add column if not exists front_photo_url text,
add column if not exists side_photo_url text;

alter table public.try_on_jobs
add column if not exists error_message text,
add column if not exists provider text,
add column if not exists actual_provider text,
add column if not exists provider_fallback_reason text,
add column if not exists provider_was_queued boolean not null default false,
add column if not exists generation_progress integer not null default 0,
add column if not exists generation_phase text,
add column if not exists generation_started_at timestamptz,
add column if not exists generation_completed_at timestamptz,
add column if not exists generation_duration_seconds integer,
add column if not exists provider_retry_count integer not null default 0,
add column if not exists is_favorite boolean not null default false;

alter table public.outfit
add column if not exists top_id uuid references public.clothes(id),
add column if not exists pants_id uuid references public.clothes(id),
add column if not exists shoes_id uuid references public.clothes(id),
add column if not exists hat_id uuid references public.clothes(id),
add column if not exists bag_id uuid references public.clothes(id),
add column if not exists items jsonb not null default '[]'::jsonb;

create index if not exists try_on_jobs_created_at_idx
on public.try_on_jobs (created_at desc);

create index if not exists try_on_jobs_status_idx
on public.try_on_jobs (status);

create index if not exists try_on_jobs_is_favorite_idx
on public.try_on_jobs (is_favorite);

create index if not exists try_on_jobs_provider_idx
on public.try_on_jobs (provider);

create index if not exists try_on_jobs_generation_phase_idx
on public.try_on_jobs (generation_phase);

alter table public.users enable row level security;
alter table public.clothes enable row level security;
alter table public.try_on_jobs enable row level security;
alter table public.outfit enable row level security;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('body-photos', 'body-photos', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('clothes', 'clothes', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Allow anonymous profile inserts" on public.users;
drop policy if exists "Allow anonymous profile reads" on public.users;
drop policy if exists "Allow anonymous profile photo updates" on public.users;
drop policy if exists "Allow anonymous clothes inserts" on public.clothes;
drop policy if exists "Allow anonymous clothes reads" on public.clothes;
drop policy if exists "Allow anonymous clothes deletes" on public.clothes;
drop policy if exists "Allow anonymous try on job inserts" on public.try_on_jobs;
drop policy if exists "Allow anonymous try on job reads" on public.try_on_jobs;
drop policy if exists "Allow anonymous try on job updates" on public.try_on_jobs;
drop policy if exists "Allow anonymous outfit inserts" on public.outfit;
drop policy if exists "Allow anonymous outfit reads" on public.outfit;
drop policy if exists "Allow anonymous outfit deletes" on public.outfit;
drop policy if exists "Allow anonymous avatar uploads" on storage.objects;
drop policy if exists "Allow anonymous body photo uploads" on storage.objects;
drop policy if exists "Allow anonymous clothes uploads" on storage.objects;
drop policy if exists "Allow anonymous clothes deletes" on storage.objects;
drop policy if exists "Allow public avatar reads" on storage.objects;
drop policy if exists "Allow public body photo reads" on storage.objects;
drop policy if exists "Allow public clothes reads" on storage.objects;

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

create policy "Allow anonymous clothes inserts"
on public.clothes
for insert
to anon
with check (true);

create policy "Allow anonymous clothes reads"
on public.clothes
for select
to anon
using (true);

create policy "Allow anonymous clothes deletes"
on public.clothes
for delete
to anon
using (true);

create policy "Allow anonymous try on job inserts"
on public.try_on_jobs
for insert
to anon
with check (true);

create policy "Allow anonymous try on job reads"
on public.try_on_jobs
for select
to anon
using (true);

create policy "Allow anonymous try on job updates"
on public.try_on_jobs
for update
to anon
using (true)
with check (true);

create policy "Allow anonymous outfit inserts"
on public.outfit
for insert
to anon
with check (true);

create policy "Allow anonymous outfit reads"
on public.outfit
for select
to anon
using (true);

create policy "Allow anonymous outfit deletes"
on public.outfit
for delete
to anon
using (true);

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

create policy "Allow anonymous clothes uploads"
on storage.objects
for insert
to anon
with check (bucket_id = 'clothes');

create policy "Allow anonymous clothes deletes"
on storage.objects
for delete
to anon
using (bucket_id = 'clothes');

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

create policy "Allow public clothes reads"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'clothes');
