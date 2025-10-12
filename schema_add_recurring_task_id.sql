-- Add recurring_task_id column to tasks_items table
-- This column will be used to group recurring tasks together

ALTER TABLE tasks_items 
ADD COLUMN recurring_task_id TEXT;

-- Add index for better performance when querying recurring tasks
CREATE INDEX IF NOT EXISTS idx_tasks_items_recurring_task_id 
ON tasks_items(recurring_task_id);

-- Add comment to explain the column purpose
COMMENT ON COLUMN tasks_items.recurring_task_id IS 'Groups recurring task instances together. All tasks with the same recurring_task_id belong to the same recurring task set.';
