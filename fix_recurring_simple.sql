-- Simple approach: group recurring tasks by title only
-- This will catch tasks that have the same title but might have slight differences

-- Step 1: Show what tasks will be grouped
SELECT 
    title,
    COUNT(*) as task_count,
    MIN(date) as first_date,
    MAX(date) as last_date,
    'recurring_' || EXTRACT(EPOCH FROM MIN(date)::timestamp)::text || '_' || 
    MD5(title) as new_recurring_id
FROM tasks_items 
WHERE recurring_task_id IS NULL
GROUP BY title
HAVING COUNT(*) > 1  -- Only groups with multiple tasks
ORDER BY task_count DESC;

-- Step 2: Update tasks with recurring_task_id based on title only
WITH recurring_groups AS (
    SELECT 
        title,
        'recurring_' || EXTRACT(EPOCH FROM MIN(date)::timestamp)::text || '_' || 
        MD5(title) as recurring_id
    FROM tasks_items 
    WHERE recurring_task_id IS NULL
    GROUP BY title
    HAVING COUNT(*) > 1
)
UPDATE tasks_items 
SET recurring_task_id = recurring_groups.recurring_id
FROM recurring_groups
WHERE tasks_items.title = recurring_groups.title
  AND tasks_items.recurring_task_id IS NULL;

-- Step 3: Show the results
SELECT 
    title,
    COUNT(*) as task_count,
    MIN(date) as first_date,
    MAX(date) as last_date,
    recurring_task_id
FROM tasks_items 
WHERE recurring_task_id IS NOT NULL
GROUP BY title, recurring_task_id
ORDER BY task_count DESC;
