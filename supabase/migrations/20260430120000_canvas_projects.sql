-- Canvas: несколько «проектов» (досок) на пользователя, состояние в JSONB

create table if not exists public.canvas_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Без названия',
  board_state jsonb not null default '{"nodes":[],"edges":[],"viewport":{"tx":80,"ty":72,"scale":1}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists canvas_projects_user_id_idx on public.canvas_projects (user_id);
create index if not exists canvas_projects_updated_at_idx on public.canvas_projects (updated_at desc);

alter table public.canvas_projects enable row level security;

create policy "canvas_projects_select_own"
  on public.canvas_projects for select
  using (auth.uid() = user_id);

create policy "canvas_projects_insert_own"
  on public.canvas_projects for insert
  with check (auth.uid() = user_id);

create policy "canvas_projects_update_own"
  on public.canvas_projects for update
  using (auth.uid() = user_id);

create policy "canvas_projects_delete_own"
  on public.canvas_projects for delete
  using (auth.uid() = user_id);
