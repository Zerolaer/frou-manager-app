-- Simple check for recurring tasks

-- 1. Show all recurring task groups
SELECT 
    title,
    COUNT(*) as task_count,
    MIN(date) as first_date,
    MAX(date) as last_date,
    recurring_task_id
FROM tasks_items 
WHERE recurring_task_id IS NOT NULL
GROUP BY title, recurring_task_id
ORDER BY task_count DESC, first_date;

-- 2. Show individual tasks in each recurring group
SELECT 
    id,
    title,
    date,
    status,
    project_id,
    recurring_task_id
FROM tasks_items 
WHERE recurring_task_id IS NOT NULL
ORDER BY recurring_task_id, date;

-- 3. Summary
SELECT 
    COUNT(DISTINCT recurring_task_id) as total_recurring_groups,
    COUNT(*) as total_recurring_tasks,
    MIN(date) as earliest_task,
    MAX(date) as latest_task
FROM tasks_items 
WHERE recurring_task_id IS NOT NULL;
