-- Add data validation constraints
-- These constraints ensure data integrity at the database level
-- Run this after adding indexes

-- ============================================
-- FINANCE_ENTRIES CONSTRAINTS
-- ============================================

-- Validate year is reasonable (1900-2100)
ALTER TABLE finance_entries
ADD CONSTRAINT IF NOT EXISTS check_finance_entries_year
CHECK (year >= 1900 AND year <= 2100);

-- Validate month is between 1-12
ALTER TABLE finance_entries
ADD CONSTRAINT IF NOT EXISTS check_finance_entries_month
CHECK (month >= 1 AND month <= 12);

-- Validate position is non-negative
ALTER TABLE finance_entries
ADD CONSTRAINT IF NOT EXISTS check_finance_entries_position
CHECK (position >= 0);

-- ============================================
-- FINANCE_CATEGORIES CONSTRAINTS
-- ============================================

-- Validate type is either 'income' or 'expense'
ALTER TABLE finance_categories
ADD CONSTRAINT IF NOT EXISTS check_finance_categories_type
CHECK (type IN ('income', 'expense'));

-- Validate name is not empty
ALTER TABLE finance_categories
ADD CONSTRAINT IF NOT EXISTS check_finance_categories_name_not_empty
CHECK (trim(name) <> '');

-- ============================================
-- TASKS_ITEMS CONSTRAINTS
-- ============================================

-- Validate position is non-negative
ALTER TABLE tasks_items
ADD CONSTRAINT IF NOT EXISTS check_tasks_items_position
CHECK (position >= 0);

-- Validate title is not empty
ALTER TABLE tasks_items
ADD CONSTRAINT IF NOT EXISTS check_tasks_items_title_not_empty
CHECK (trim(title) <> '');

-- Validate status (if used)
ALTER TABLE tasks_items
ADD CONSTRAINT IF NOT EXISTS check_tasks_items_status
CHECK (status IS NULL OR status IN ('open', 'closed', 'in_progress', 'blocked'));

-- Validate priority (if used)
ALTER TABLE tasks_items
ADD CONSTRAINT IF NOT EXISTS check_tasks_items_priority
CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high', 'urgent'));

-- ============================================
-- TASKS_PROJECTS CONSTRAINTS
-- ============================================

-- Validate name is not empty
ALTER TABLE tasks_projects
ADD CONSTRAINT IF NOT EXISTS check_tasks_projects_name_not_empty
CHECK (trim(name) <> '');

-- Validate position is non-negative
ALTER TABLE tasks_projects
ADD CONSTRAINT IF NOT EXISTS check_tasks_projects_position
CHECK (position >= 0);

-- ============================================
-- NOTES_FOLDERS CONSTRAINTS
-- ============================================

-- Validate name is not empty
ALTER TABLE notes_folders
ADD CONSTRAINT IF NOT EXISTS check_notes_folders_name_not_empty
CHECK (trim(name) <> '');

-- Prevent self-referencing parent
ALTER TABLE notes_folders
ADD CONSTRAINT IF NOT EXISTS check_notes_folders_no_self_parent
CHECK (id != parent_id);

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
-- INSERT INTO finance_entries (year, month) VALUES (1800, 13); -- Should fail
-- INSERT INTO finance_categories (type, name) VALUES ('invalid', ''); -- Should fail
-- INSERT INTO tasks_items (title) VALUES (''); -- Should fail

