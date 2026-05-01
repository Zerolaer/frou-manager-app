-- ─────────────────────────────────────────────────────────────────────────────
-- FROVO Manager — единый release-setup
-- ─────────────────────────────────────────────────────────────────────────────
-- Назначение: создаёт ВСЮ схему БД, нужную приложению, плюс RLS-политики,
-- индексы и триггеры. Полностью идемпотентен — можно гонять много раз,
-- ничего не сломает (используется CREATE ... IF NOT EXISTS, ADD COLUMN IF NOT
-- EXISTS, DROP POLICY IF EXISTS перед CREATE POLICY).
--
-- Как применять:
--   Supabase Dashboard → SQL Editor → New query → вставить весь файл → Run.
--
-- Что охватывает:
--   • tasks_projects, tasks_items, recurring_tasks
--   • finance_categories, finance_entries
--   • notes, notes_folders
--   • habits, habit_entries
--   • invoice_folders, invoice_client_templates, invoice_from_templates,
--     invoices, invoice_items
--   • canvas_projects
-- ─────────────────────────────────────────────────────────────────────────────

-- pgcrypto нужен для gen_random_uuid()
create extension if not exists pgcrypto;

-- ============================================================================
-- УТИЛИТЫ
-- ============================================================================

-- Универсальный триггер обновления updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Триггер для notes/notes_folders/etc — автоматически проставляет user_id из auth.uid(),
-- если клиент не передал. Это нужно, потому что часть кода создаёт записи без user_id.
create or replace function public.set_user_id_from_auth()
returns trigger
language plpgsql as $$
begin
  if new.user_id is null then
    new.user_id = auth.uid();
  end if;
  return new;
end;
$$;

-- ============================================================================
-- TASKS — projects, items, recurring
-- ============================================================================

create table if not exists public.tasks_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  position integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_projects_user_id on public.tasks_projects(user_id);
create index if not exists idx_tasks_projects_position on public.tasks_projects(user_id, position);

alter table public.tasks_projects enable row level security;
drop policy if exists "tasks_projects_select_own" on public.tasks_projects;
drop policy if exists "tasks_projects_insert_own" on public.tasks_projects;
drop policy if exists "tasks_projects_update_own" on public.tasks_projects;
drop policy if exists "tasks_projects_delete_own" on public.tasks_projects;
create policy "tasks_projects_select_own" on public.tasks_projects for select using (auth.uid() = user_id);
create policy "tasks_projects_insert_own" on public.tasks_projects for insert with check (auth.uid() = user_id);
create policy "tasks_projects_update_own" on public.tasks_projects for update using (auth.uid() = user_id);
create policy "tasks_projects_delete_own" on public.tasks_projects for delete using (auth.uid() = user_id);


create table if not exists public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  priority text default 'normal',
  tag text default '',
  todos jsonb not null default '[]'::jsonb,
  project_id uuid references public.tasks_projects(id) on delete set null,
  recurrence_type text,
  recurrence_interval integer default 1,
  recurrence_day_of_week integer,
  recurrence_day_of_month integer,
  recurrence_month_of_year integer,
  start_date date,
  end_date date,
  next_occurrence date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recurring_tasks_user_id on public.recurring_tasks(user_id);
create index if not exists idx_recurring_tasks_active on public.recurring_tasks(user_id, is_active);

alter table public.recurring_tasks enable row level security;
drop policy if exists "recurring_tasks_select_own" on public.recurring_tasks;
drop policy if exists "recurring_tasks_insert_own" on public.recurring_tasks;
drop policy if exists "recurring_tasks_update_own" on public.recurring_tasks;
drop policy if exists "recurring_tasks_delete_own" on public.recurring_tasks;
create policy "recurring_tasks_select_own" on public.recurring_tasks for select using (auth.uid() = user_id);
create policy "recurring_tasks_insert_own" on public.recurring_tasks for insert with check (auth.uid() = user_id);
create policy "recurring_tasks_update_own" on public.recurring_tasks for update using (auth.uid() = user_id);
create policy "recurring_tasks_delete_own" on public.recurring_tasks for delete using (auth.uid() = user_id);

drop trigger if exists trg_recurring_tasks_updated_at on public.recurring_tasks;
create trigger trg_recurring_tasks_updated_at
  before update on public.recurring_tasks
  for each row execute function public.set_updated_at();


create table if not exists public.tasks_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.tasks_projects(id) on delete set null,
  parent_task_id uuid references public.tasks_items(id) on delete cascade,
  recurring_task_id uuid references public.recurring_tasks(id) on delete set null,
  title text not null,
  description text,
  date date,
  start_date date,
  due_date date,
  position integer not null default 0,
  priority text default 'normal',
  tag text,
  todos jsonb not null default '[]'::jsonb,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- На случай, если таблица уже существовала со старой структурой — подмажем недостающее.
alter table public.tasks_items add column if not exists parent_task_id uuid references public.tasks_items(id) on delete cascade;
alter table public.tasks_items add column if not exists recurring_task_id uuid references public.recurring_tasks(id) on delete set null;
alter table public.tasks_items add column if not exists start_date date;
alter table public.tasks_items add column if not exists due_date date;
alter table public.tasks_items add column if not exists todos jsonb not null default '[]'::jsonb;
alter table public.tasks_items add column if not exists status text not null default 'open';
alter table public.tasks_items add column if not exists tag text;

create index if not exists idx_tasks_items_user_id on public.tasks_items(user_id);
create index if not exists idx_tasks_items_project_id on public.tasks_items(project_id);
create index if not exists idx_tasks_items_parent_task_id on public.tasks_items(parent_task_id);
create index if not exists idx_tasks_items_recurring_task_id on public.tasks_items(recurring_task_id);
create index if not exists idx_tasks_items_date on public.tasks_items(user_id, date);
create index if not exists idx_tasks_items_status on public.tasks_items(user_id, status);

alter table public.tasks_items enable row level security;
drop policy if exists "tasks_items_select_own" on public.tasks_items;
drop policy if exists "tasks_items_insert_own" on public.tasks_items;
drop policy if exists "tasks_items_update_own" on public.tasks_items;
drop policy if exists "tasks_items_delete_own" on public.tasks_items;
create policy "tasks_items_select_own" on public.tasks_items for select using (auth.uid() = user_id);
create policy "tasks_items_insert_own" on public.tasks_items for insert with check (auth.uid() = user_id);
create policy "tasks_items_update_own" on public.tasks_items for update using (auth.uid() = user_id);
create policy "tasks_items_delete_own" on public.tasks_items for delete using (auth.uid() = user_id);

drop trigger if exists trg_tasks_items_updated_at on public.tasks_items;
create trigger trg_tasks_items_updated_at
  before update on public.tasks_items
  for each row execute function public.set_updated_at();

-- Автоматически проставляем user_id из auth.uid(), если клиент его не передал.
drop trigger if exists trg_tasks_items_set_user on public.tasks_items;
create trigger trg_tasks_items_set_user
  before insert on public.tasks_items
  for each row execute function public.set_user_id_from_auth();

-- ============================================================================
-- FINANCE — categories + entries
-- ============================================================================

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.finance_categories(id) on delete set null,
  name text not null,
  type text not null check (type in ('income','expense')),
  created_at timestamptz not null default now()
);

create index if not exists idx_finance_categories_user_id on public.finance_categories(user_id);
create index if not exists idx_finance_categories_type on public.finance_categories(user_id, type);
create index if not exists idx_finance_categories_parent on public.finance_categories(parent_id);

alter table public.finance_categories enable row level security;
drop policy if exists "finance_categories_select_own" on public.finance_categories;
drop policy if exists "finance_categories_insert_own" on public.finance_categories;
drop policy if exists "finance_categories_update_own" on public.finance_categories;
drop policy if exists "finance_categories_delete_own" on public.finance_categories;
create policy "finance_categories_select_own" on public.finance_categories for select using (auth.uid() = user_id);
create policy "finance_categories_insert_own" on public.finance_categories for insert with check (auth.uid() = user_id);
create policy "finance_categories_update_own" on public.finance_categories for update using (auth.uid() = user_id);
create policy "finance_categories_delete_own" on public.finance_categories for delete using (auth.uid() = user_id);


create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.finance_categories(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  amount numeric not null default 0,
  currency text default 'EUR',
  included boolean not null default true,
  position integer not null default 0,
  -- Десктоп клиент пишет в `note`, мобильный в `description` — поддерживаем оба
  -- столбца, чтобы существующие данные не потерялись.
  note text,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_finance_entries_user_id on public.finance_entries(user_id);
create index if not exists idx_finance_entries_year_month on public.finance_entries(user_id, year, month);
create index if not exists idx_finance_entries_category on public.finance_entries(category_id);
create index if not exists idx_finance_entries_lookup on public.finance_entries(category_id, year, month);

alter table public.finance_entries enable row level security;
drop policy if exists "finance_entries_select_own" on public.finance_entries;
drop policy if exists "finance_entries_insert_own" on public.finance_entries;
drop policy if exists "finance_entries_update_own" on public.finance_entries;
drop policy if exists "finance_entries_delete_own" on public.finance_entries;
create policy "finance_entries_select_own" on public.finance_entries for select using (auth.uid() = user_id);
create policy "finance_entries_insert_own" on public.finance_entries for insert with check (auth.uid() = user_id);
create policy "finance_entries_update_own" on public.finance_entries for update using (auth.uid() = user_id);
create policy "finance_entries_delete_own" on public.finance_entries for delete using (auth.uid() = user_id);

-- ============================================================================
-- NOTES — folders + notes
-- ============================================================================

create table if not exists public.notes_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  position integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_notes_folders_user_id on public.notes_folders(user_id);
create index if not exists idx_notes_folders_position on public.notes_folders(user_id, position);

alter table public.notes_folders enable row level security;
drop policy if exists "notes_folders_select_own" on public.notes_folders;
drop policy if exists "notes_folders_insert_own" on public.notes_folders;
drop policy if exists "notes_folders_update_own" on public.notes_folders;
drop policy if exists "notes_folders_delete_own" on public.notes_folders;
create policy "notes_folders_select_own" on public.notes_folders for select using (auth.uid() = user_id);
create policy "notes_folders_insert_own" on public.notes_folders for insert with check (auth.uid() = user_id);
create policy "notes_folders_update_own" on public.notes_folders for update using (auth.uid() = user_id);
create policy "notes_folders_delete_own" on public.notes_folders for delete using (auth.uid() = user_id);


create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.notes_folders(id) on delete set null,
  title text not null default '',
  content text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notes_user_id on public.notes(user_id);
create index if not exists idx_notes_folder_id on public.notes(folder_id);
create index if not exists idx_notes_pinned on public.notes(user_id, pinned);
create index if not exists idx_notes_updated on public.notes(user_id, updated_at desc);

alter table public.notes enable row level security;
drop policy if exists "notes_select_own" on public.notes;
drop policy if exists "notes_insert_own" on public.notes;
drop policy if exists "notes_update_own" on public.notes;
drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_select_own" on public.notes for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes for update using (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes for delete using (auth.uid() = user_id);

drop trigger if exists trg_notes_updated_at on public.notes;
create trigger trg_notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- Клиент в `features/notes/api.ts` создаёт заметки без user_id — заполняем из auth.uid()
drop trigger if exists trg_notes_set_user on public.notes;
create trigger trg_notes_set_user
  before insert on public.notes
  for each row execute function public.set_user_id_from_auth();

-- ============================================================================
-- HABITS
-- ============================================================================

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null check (type in ('automatic','manual','progress')),
  start_date date not null,
  end_date date,
  initial_value numeric default 0,
  target_value numeric,
  current_value numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_habits_user_id on public.habits(user_id);
create index if not exists idx_habits_type on public.habits(type);

alter table public.habits enable row level security;
drop policy if exists "habits_select_own" on public.habits;
drop policy if exists "habits_insert_own" on public.habits;
drop policy if exists "habits_update_own" on public.habits;
drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_select_own" on public.habits for select using (auth.uid() = user_id);
create policy "habits_insert_own" on public.habits for insert with check (auth.uid() = user_id);
create policy "habits_update_own" on public.habits for update using (auth.uid() = user_id);
create policy "habits_delete_own" on public.habits for delete using (auth.uid() = user_id);

drop trigger if exists trg_habits_updated_at on public.habits;
create trigger trg_habits_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();


create table if not exists public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  value numeric,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

create index if not exists idx_habit_entries_habit_id on public.habit_entries(habit_id);
create index if not exists idx_habit_entries_date on public.habit_entries(date);
create index if not exists idx_habit_entries_habit_date on public.habit_entries(habit_id, date);

alter table public.habit_entries enable row level security;
drop policy if exists "habit_entries_select_own" on public.habit_entries;
drop policy if exists "habit_entries_insert_own" on public.habit_entries;
drop policy if exists "habit_entries_update_own" on public.habit_entries;
drop policy if exists "habit_entries_delete_own" on public.habit_entries;
create policy "habit_entries_select_own" on public.habit_entries for select using (
  exists (select 1 from public.habits h where h.id = habit_entries.habit_id and h.user_id = auth.uid())
);
create policy "habit_entries_insert_own" on public.habit_entries for insert with check (
  exists (select 1 from public.habits h where h.id = habit_entries.habit_id and h.user_id = auth.uid())
);
create policy "habit_entries_update_own" on public.habit_entries for update using (
  exists (select 1 from public.habits h where h.id = habit_entries.habit_id and h.user_id = auth.uid())
);
create policy "habit_entries_delete_own" on public.habit_entries for delete using (
  exists (select 1 from public.habits h where h.id = habit_entries.habit_id and h.user_id = auth.uid())
);

-- ============================================================================
-- INVOICES — folders, client/from templates, invoices, items
-- ============================================================================

create table if not exists public.invoice_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text default '#3b82f6',
  position integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoice_folders_user_id on public.invoice_folders(user_id);

alter table public.invoice_folders enable row level security;
drop policy if exists "invoice_folders_select_own" on public.invoice_folders;
drop policy if exists "invoice_folders_insert_own" on public.invoice_folders;
drop policy if exists "invoice_folders_update_own" on public.invoice_folders;
drop policy if exists "invoice_folders_delete_own" on public.invoice_folders;
create policy "invoice_folders_select_own" on public.invoice_folders for select using (auth.uid() = user_id);
create policy "invoice_folders_insert_own" on public.invoice_folders for insert with check (auth.uid() = user_id);
create policy "invoice_folders_update_own" on public.invoice_folders for update using (auth.uid() = user_id);
create policy "invoice_folders_delete_own" on public.invoice_folders for delete using (auth.uid() = user_id);

drop trigger if exists trg_invoice_folders_updated_at on public.invoice_folders;
create trigger trg_invoice_folders_updated_at before update on public.invoice_folders
  for each row execute function public.set_updated_at();


create table if not exists public.invoice_client_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoice_client_templates_user_id on public.invoice_client_templates(user_id);

alter table public.invoice_client_templates enable row level security;
drop policy if exists "invoice_client_templates_select_own" on public.invoice_client_templates;
drop policy if exists "invoice_client_templates_insert_own" on public.invoice_client_templates;
drop policy if exists "invoice_client_templates_update_own" on public.invoice_client_templates;
drop policy if exists "invoice_client_templates_delete_own" on public.invoice_client_templates;
create policy "invoice_client_templates_select_own" on public.invoice_client_templates for select using (auth.uid() = user_id);
create policy "invoice_client_templates_insert_own" on public.invoice_client_templates for insert with check (auth.uid() = user_id);
create policy "invoice_client_templates_update_own" on public.invoice_client_templates for update using (auth.uid() = user_id);
create policy "invoice_client_templates_delete_own" on public.invoice_client_templates for delete using (auth.uid() = user_id);

drop trigger if exists trg_invoice_client_templates_updated_at on public.invoice_client_templates;
create trigger trg_invoice_client_templates_updated_at before update on public.invoice_client_templates
  for each row execute function public.set_updated_at();


create table if not exists public.invoice_from_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  country text,
  city text,
  province text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  account_number text,
  routing_number text,
  swift_bic text,
  bank_name text,
  bank_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoice_from_templates_user_id on public.invoice_from_templates(user_id);

alter table public.invoice_from_templates enable row level security;
drop policy if exists "invoice_from_templates_select_own" on public.invoice_from_templates;
drop policy if exists "invoice_from_templates_insert_own" on public.invoice_from_templates;
drop policy if exists "invoice_from_templates_update_own" on public.invoice_from_templates;
drop policy if exists "invoice_from_templates_delete_own" on public.invoice_from_templates;
create policy "invoice_from_templates_select_own" on public.invoice_from_templates for select using (auth.uid() = user_id);
create policy "invoice_from_templates_insert_own" on public.invoice_from_templates for insert with check (auth.uid() = user_id);
create policy "invoice_from_templates_update_own" on public.invoice_from_templates for update using (auth.uid() = user_id);
create policy "invoice_from_templates_delete_own" on public.invoice_from_templates for delete using (auth.uid() = user_id);

drop trigger if exists trg_invoice_from_templates_updated_at on public.invoice_from_templates;
create trigger trg_invoice_from_templates_updated_at before update on public.invoice_from_templates
  for each row execute function public.set_updated_at();


create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.invoice_folders(id) on delete set null,
  invoice_number text not null,
  date date not null,
  due_date date not null,
  notes text,
  -- Отправитель (FROM)
  from_name text,
  from_country text,
  from_city text,
  from_province text,
  from_address_line1 text,
  from_address_line2 text,
  from_postal_code text,
  from_account_number text,
  from_routing_number text,
  from_swift_bic text,
  from_bank_name text,
  from_bank_address text,
  -- Клиент (TO)
  client_name text not null,
  client_email text,
  client_address text,
  client_phone text,
  subtotal numeric(10,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  currency text default 'EUR',
  status text default 'Waiting' check (status in ('Waiting','Paid','Canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Защита для случая, когда таблица уже существовала со старой схемой
alter table public.invoices add column if not exists folder_id uuid references public.invoice_folders(id) on delete set null;
alter table public.invoices add column if not exists currency text default 'EUR';
alter table public.invoices add column if not exists status text default 'Waiting';
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'invoices_status_check'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices add constraint invoices_status_check
      check (status in ('Waiting','Paid','Canceled'));
  end if;
end$$;
update public.invoices set status = 'Waiting' where status is null;

create index if not exists idx_invoices_user_id on public.invoices(user_id);
create index if not exists idx_invoices_folder_id on public.invoices(folder_id);
create index if not exists idx_invoices_created_at on public.invoices(created_at desc);

alter table public.invoices enable row level security;
drop policy if exists "invoices_select_own" on public.invoices;
drop policy if exists "invoices_insert_own" on public.invoices;
drop policy if exists "invoices_update_own" on public.invoices;
drop policy if exists "invoices_delete_own" on public.invoices;
create policy "invoices_select_own" on public.invoices for select using (auth.uid() = user_id);
create policy "invoices_insert_own" on public.invoices for insert with check (auth.uid() = user_id);
create policy "invoices_update_own" on public.invoices for update using (auth.uid() = user_id);
create policy "invoices_delete_own" on public.invoices for delete using (auth.uid() = user_id);

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();


create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  period text,
  quantity numeric(10,2) not null default 1,
  price numeric(10,2) not null default 0,
  price_per_hour numeric(10,2),
  hours numeric(10,2),
  item_type text default 'product',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.invoice_items add column if not exists period text;
alter table public.invoice_items add column if not exists price_per_hour numeric(10,2);
alter table public.invoice_items add column if not exists hours numeric(10,2);
alter table public.invoice_items add column if not exists item_type text default 'product';

create index if not exists idx_invoice_items_invoice_id on public.invoice_items(invoice_id);
create index if not exists idx_invoice_items_position on public.invoice_items(invoice_id, position);

alter table public.invoice_items enable row level security;
drop policy if exists "invoice_items_select_own" on public.invoice_items;
drop policy if exists "invoice_items_insert_own" on public.invoice_items;
drop policy if exists "invoice_items_update_own" on public.invoice_items;
drop policy if exists "invoice_items_delete_own" on public.invoice_items;
create policy "invoice_items_select_own" on public.invoice_items for select using (
  exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
);
create policy "invoice_items_insert_own" on public.invoice_items for insert with check (
  exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
);
create policy "invoice_items_update_own" on public.invoice_items for update using (
  exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
);
create policy "invoice_items_delete_own" on public.invoice_items for delete using (
  exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
);

-- ============================================================================
-- CANVAS
-- ============================================================================

create table if not exists public.canvas_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Без названия',
  board_state jsonb not null default '{"nodes":[],"edges":[],"viewport":{"tx":80,"ty":72,"scale":1}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_canvas_projects_user_id on public.canvas_projects(user_id);
create index if not exists idx_canvas_projects_updated_at on public.canvas_projects(updated_at desc);

alter table public.canvas_projects enable row level security;
drop policy if exists "canvas_projects_select_own" on public.canvas_projects;
drop policy if exists "canvas_projects_insert_own" on public.canvas_projects;
drop policy if exists "canvas_projects_update_own" on public.canvas_projects;
drop policy if exists "canvas_projects_delete_own" on public.canvas_projects;
create policy "canvas_projects_select_own" on public.canvas_projects for select using (auth.uid() = user_id);
create policy "canvas_projects_insert_own" on public.canvas_projects for insert with check (auth.uid() = user_id);
create policy "canvas_projects_update_own" on public.canvas_projects for update using (auth.uid() = user_id);
create policy "canvas_projects_delete_own" on public.canvas_projects for delete using (auth.uid() = user_id);

drop trigger if exists trg_canvas_projects_updated_at on public.canvas_projects;
create trigger trg_canvas_projects_updated_at before update on public.canvas_projects
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ИТОГ
-- ============================================================================

select 'OK' as setup_status, now() as completed_at;
