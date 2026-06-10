-- Approximate scheduled time for tasks (displayed in tag block UI)
alter table public.tasks_items
  add column if not exists scheduled_time text;

alter table public.recurring_tasks
  add column if not exists scheduled_time text;

comment on column public.tasks_items.scheduled_time is 'Optional HH:mm scheduled time for the task';
comment on column public.recurring_tasks.scheduled_time is 'Optional HH:mm scheduled time copied to generated tasks';
