-- Coffee Brew Lab schema
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id text primary key,
  owner_id uuid references auth.users(id) on delete set null,
  slug text unique not null,
  title text not null,
  brewer text not null,
  description text not null,
  quote text not null,
  cover_image_url text not null,
  is_public boolean not null default false,
  difficulty text not null default 'Medium',
  brew_time_min int not null default 4,
  active_version_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_versions (
  id text primary key,
  recipe_id text not null references public.recipes(id) on delete cascade,
  version_number int not null,
  base_water_grams numeric not null,
  base_dose_grams numeric not null,
  target_temp_c int not null,
  grind_label text not null,
  notes text not null default '',
  equipment text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique(recipe_id, version_number)
);

create table if not exists public.recipe_steps (
  id text primary key,
  version_id text not null references public.recipe_versions(id) on delete cascade,
  step_order int not null,
  type text not null check (type in ('prep', 'pour', 'wait', 'stir', 'press', 'serve')),
  instruction text not null,
  target_water_grams numeric,
  duration_sec int,
  window_start_sec int,
  window_end_sec int,
  tips text,
  created_at timestamptz not null default now()
);

create table if not exists public.share_links (
  id text primary key,
  recipe_id text not null references public.recipes(id) on delete cascade,
  token text not null unique,
  published_version_id text not null references public.recipe_versions(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.recipes enable row level security;
alter table public.recipe_versions enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.share_links enable row level security;
alter table public.profiles enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own"
  on public.profiles for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- recipes
drop policy if exists "recipes_public_read" on public.recipes;
create policy "recipes_public_read"
  on public.recipes for select
  to anon, authenticated
  using (is_public = true);

drop policy if exists "recipes_owner_all" on public.recipes;
create policy "recipes_owner_all"
  on public.recipes for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- versions
drop policy if exists "versions_read_public" on public.recipe_versions;
create policy "versions_read_public"
  on public.recipe_versions for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
      and r.is_public = true
    )
  );

drop policy if exists "versions_owner_all" on public.recipe_versions;
create policy "versions_owner_all"
  on public.recipe_versions for all
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
      and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
      and r.owner_id = auth.uid()
    )
  );

-- steps
drop policy if exists "steps_read_public" on public.recipe_steps;
create policy "steps_read_public"
  on public.recipe_steps for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.recipe_versions rv
      join public.recipes r on r.id = rv.recipe_id
      where rv.id = version_id
      and r.is_public = true
    )
  );

drop policy if exists "steps_owner_all" on public.recipe_steps;
create policy "steps_owner_all"
  on public.recipe_steps for all
  to authenticated
  using (
    exists (
      select 1
      from public.recipe_versions rv
      join public.recipes r on r.id = rv.recipe_id
      where rv.id = version_id
      and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.recipe_versions rv
      join public.recipes r on r.id = rv.recipe_id
      where rv.id = version_id
      and r.owner_id = auth.uid()
    )
  );

-- share links
drop policy if exists "share_read_public" on public.share_links;
create policy "share_read_public"
  on public.share_links for select
  to anon, authenticated
  using (revoked_at is null);

drop policy if exists "share_owner_all" on public.share_links;
create policy "share_owner_all"
  on public.share_links for all
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Storage bucket setup (run once):
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

drop policy if exists "recipe_images_public_read" on storage.objects;
create policy "recipe_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'recipe-images');

drop policy if exists "recipe_images_auth_insert" on storage.objects;
create policy "recipe_images_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "recipe_images_auth_update" on storage.objects;
create policy "recipe_images_auth_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'recipe-images'
    and owner = auth.uid()
  )
  with check (
    bucket_id = 'recipe-images'
    and owner = auth.uid()
  );

drop policy if exists "recipe_images_auth_delete" on storage.objects;
create policy "recipe_images_auth_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'recipe-images'
    and owner = auth.uid()
  );

-- After applying schema.sql, apply supabase/seed.sql to insert baseline brew cards.
