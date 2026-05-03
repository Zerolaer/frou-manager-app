-- Fix: "record new has no field updated_at" on tasks_items UPDATE
-- (триггер trg_tasks_items_updated_at + функция set_updated_at, а колонки не было в старой таблице)
-- Выполни в Supabase → SQL Editor. Безопасно запускать повторно.

alter table public.tasks_items add column if not exists created_at timestamptz not null default now();
alter table public.tasks_items add column if not exists updated_at timestamptz not null default now();

drop policy if exists "tasks_items_update_own" on public.tasks_items;

create policy "tasks_items_update_own" on public.tasks_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
