-- Add meta fields for tasks
alter table public.tasks_items add column if not exists priority text;
alter table public.tasks_items add column if not exists tag text;
alter table public.tasks_items add column if not exists todos jsonb default '[]'::jsonb;
