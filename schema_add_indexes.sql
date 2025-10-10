-- Add critical indexes for performance optimization
-- These indexes will speed up queries by 10-100x
-- Run this after all other schema migrations

-- ============================================
-- TASKS_ITEMS INDEXES
-- ============================================

-- Index for date-based queries (most common - filtering tasks by date)
CREATE INDEX IF NOT EXISTS idx_tasks_items_date 
ON tasks_items(date);

-- Index for status-based queries (filtering by open/closed)
CREATE INDEX IF NOT EXISTS idx_tasks_items_status 
ON tasks_items(status);

-- Index for user-based queries (RLS filtering)
CREATE INDEX IF NOT EXISTS idx_tasks_items_user_id 
ON tasks_items(user_id);

-- Composite index for common query pattern: user + date
CREATE INDEX IF NOT EXISTS idx_tasks_items_user_date 
ON tasks_items(user_id, date);

-- Index for project-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_items_project_id 
ON tasks_items(project_id) 
WHERE project_id IS NOT NULL;

-- ============================================
-- FINANCE_ENTRIES INDEXES
-- ============================================

-- Composite index for year/month queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_finance_entries_year_month 
ON finance_entries(year, month);

-- Index for category-based queries
CREATE INDEX IF NOT EXISTS idx_finance_entries_category_id 
ON finance_entries(category_id);

-- Index for user-based queries (RLS filtering)
CREATE INDEX IF NOT EXISTS idx_finance_entries_user_id 
ON finance_entries(user_id);

-- Composite index for complete query pattern: user + year + month
CREATE INDEX IF NOT EXISTS idx_finance_entries_user_year_month 
ON finance_entries(user_id, year, month);

-- ============================================
-- FINANCE_CATEGORIES INDEXES
-- ============================================

-- Index for user-based queries (RLS filtering)
CREATE INDEX IF NOT EXISTS idx_finance_categories_user_id 
ON finance_categories(user_id);

-- Index for type-based queries (income vs expense)
CREATE INDEX IF NOT EXISTS idx_finance_categories_type 
ON finance_categories(type);

-- Index for parent_id (hierarchical queries)
CREATE INDEX IF NOT EXISTS idx_finance_categories_parent_id 
ON finance_categories(parent_id) 
WHERE parent_id IS NOT NULL;

-- ============================================
-- NOTES_FOLDERS INDEXES
-- ============================================

-- Index for user-based queries (RLS filtering)
CREATE INDEX IF NOT EXISTS idx_notes_folders_user_id 
ON notes_folders(user_id);

-- Index for parent_id (hierarchical queries)
CREATE INDEX IF NOT EXISTS idx_notes_folders_parent_id 
ON notes_folders(parent_id) 
WHERE parent_id IS NOT NULL;

-- ============================================
-- TASKS_PROJECTS INDEXES
-- ============================================

-- Index for user-based queries (RLS filtering)
CREATE INDEX IF NOT EXISTS idx_tasks_projects_user_id 
ON tasks_projects(user_id);

-- Index for position (ordering)
CREATE INDEX IF NOT EXISTS idx_tasks_projects_position 
ON tasks_projects(position);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify indexes were created:
-- SELECT schemaname, tablename, indexname FROM pg_indexes WHERE tablename IN ('tasks_items', 'finance_entries', 'finance_categories', 'notes_folders', 'tasks_projects') ORDER BY tablename, indexname;

-- Check index usage stats:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch FROM pg_stat_user_indexes WHERE schemaname = 'public' ORDER BY idx_scan DESC;

