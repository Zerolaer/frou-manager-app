-- Fix existing recurring tasks by assigning recurring_task_id
-- This script will group tasks with the same title and similar dates

-- Step 1: Create a temporary table to identify recurring tasks
CREATE TEMP TABLE temp_recurring_groups AS
SELECT 
    title,
    description,
    project_id,
    priority,
    tag,
    todos,
    MIN(date) as first_date,
    COUNT(*) as task_count,
    -- Generate a unique ID for each recurring group
    'recurring_' || EXTRACT(EPOCH FROM MIN(date)::timestamp)::text || '_' || 
    MD5(title || COALESCE(description, '') || project_id::text) as recurring_id
FROM tasks_items 
WHERE recurring_task_id IS NULL
GROUP BY title, description, project_id, priority, tag, todos
HAVING COUNT(*) > 1  -- Only groups with multiple tasks
ORDER BY first_date;

-- Step 2: Show what will be updated (for verification)
SELECT 
    title,
    task_count,
    first_date,
    recurring_id
FROM temp_recurring_groups;

-- Step 3: Update the tasks with their recurring_task_id
UPDATE tasks_items 
SET recurring_task_id = temp_recurring_groups.recurring_id
FROM temp_recurring_groups
WHERE tasks_items.title = temp_recurring_groups.title
  AND tasks_items.description = temp_recurring_groups.description
  AND tasks_items.project_id = temp_recurring_groups.project_id
  AND tasks_items.priority = temp_recurring_groups.priority
  AND tasks_items.tag = temp_recurring_groups.tag
  AND tasks_items.todos = temp_recurring_groups.todos
  AND tasks_items.recurring_task_id IS NULL;

-- Step 4: Show the results
SELECT 
    title,
    COUNT(*) as task_count,
    MIN(date) as first_date,
    MAX(date) as last_date,
    recurring_task_id
FROM tasks_items 
WHERE recurring_task_id IS NOT NULL
GROUP BY title, recurring_task_id
ORDER BY first_date;

-- Clean up
DROP TABLE temp_recurring_groups;
