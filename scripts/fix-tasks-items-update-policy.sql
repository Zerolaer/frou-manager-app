-- Run in Supabase SQL Editor if task updates return 0 rows / nothing persists.
-- Safe to run multiple times.

drop policy if exists "tasks_items_update_own" on public.tasks_items;

create policy "tasks_items_update_own" on public.tasks_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
