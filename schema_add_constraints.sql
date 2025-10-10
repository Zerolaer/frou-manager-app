-- Add data validation constraints
-- These constraints ensure data integrity at the database level
-- Run this after adding indexes

-- Note: PostgreSQL doesn't support IF NOT EXISTS for constraints
-- If constraint already exists, it will show a notice (safe to ignore)

-- ============================================
-- FINANCE_ENTRIES CONSTRAINTS
-- ============================================

-- Validate year is reasonable (1900-2100)
DO $$ 
BEGIN
  ALTER TABLE finance_entries
  ADD CONSTRAINT check_finance_entries_year
  CHECK (year >= 1900 AND year <= 2100);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Validate month is between 1-12
DO $$ 
BEGIN
  ALTER TABLE finance_entries
  ADD CONSTRAINT check_finance_entries_month
  CHECK (month >= 1 AND month <= 12);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Validate position is non-negative
DO $$ 
BEGIN
  ALTER TABLE finance_entries
  ADD CONSTRAINT check_finance_entries_position
  CHECK (position >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- FINANCE_CATEGORIES CONSTRAINTS
-- ============================================

-- Validate type is either 'income' or 'expense'
DO $$ 
BEGIN
  ALTER TABLE finance_categories
  ADD CONSTRAINT check_finance_categories_type
  CHECK (type IN ('income', 'expense'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Validate name is not empty
DO $$ 
BEGIN
  ALTER TABLE finance_categories
  ADD CONSTRAINT check_finance_categories_name_not_empty
  CHECK (trim(name) <> '');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TASKS_ITEMS CONSTRAINTS
-- ============================================

-- Validate position is non-negative
DO $$ 
BEGIN
  ALTER TABLE tasks_items
  ADD CONSTRAINT check_tasks_items_position
  CHECK (position >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Validate title is not empty
DO $$ 
BEGIN
  ALTER TABLE tasks_items
  ADD CONSTRAINT check_tasks_items_title_not_empty
  CHECK (trim(title) <> '');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Validate status (if used)
DO $$ 
BEGIN
  ALTER TABLE tasks_items
  ADD CONSTRAINT check_tasks_items_status
  CHECK (status IS NULL OR status IN ('open', 'closed', 'in_progress', 'blocked'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Validate priority (if used) - включая 'normal'
DO $$ 
BEGIN
  ALTER TABLE tasks_items
  ADD CONSTRAINT check_tasks_items_priority
  CHECK (priority IS NULL OR priority IN ('low', 'normal', 'medium', 'high', 'urgent'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TASKS_PROJECTS CONSTRAINTS
-- ============================================

-- Validate name is not empty
DO $$ 
BEGIN
  ALTER TABLE tasks_projects
  ADD CONSTRAINT check_tasks_projects_name_not_empty
  CHECK (trim(name) <> '');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Validate position is non-negative
DO $$ 
BEGIN
  ALTER TABLE tasks_projects
  ADD CONSTRAINT check_tasks_projects_position
  CHECK (position >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- NOTES_FOLDERS CONSTRAINTS
-- ============================================

-- Validate name is not empty
DO $$ 
BEGIN
  ALTER TABLE notes_folders
  ADD CONSTRAINT check_notes_folders_name_not_empty
  CHECK (trim(name) <> '');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Validate position is non-negative
DO $$ 
BEGIN
  ALTER TABLE notes_folders
  ADD CONSTRAINT check_notes_folders_position
  CHECK (position >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify constraints were created:
-- SELECT conname, contype, pg_get_constraintdef(oid) as definition 
-- FROM pg_constraint 
-- WHERE conrelid IN (
--   'tasks_items'::regclass, 
--   'finance_entries'::regclass, 
--   'finance_categories'::regclass,
--   'notes_folders'::regclass,
--   'tasks_projects'::regclass
-- ) 
-- AND contype = 'c'
-- ORDER BY conrelid::regclass::text, conname;

-- Test constraints (should fail):
-- INSERT INTO finance_entries (year, month, user_id, category_id) VALUES (1800, 13, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'); -- Should fail
-- INSERT INTO finance_categories (type, name, user_id) VALUES ('invalid', '', '00000000-0000-0000-0000-000000000000'); -- Should fail
-- INSERT INTO tasks_items (title, user_id) VALUES ('', '00000000-0000-0000-0000-000000000000'); -- Should fail
