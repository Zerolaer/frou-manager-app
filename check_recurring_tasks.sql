-- Check which tasks have recurring_task_id
SELECT 
    title,
    date,
    recurring_task_id,
    COUNT(*) OVER (PARTITION BY recurring_task_id) as group_size
FROM tasks_items 
WHERE recurring_task_id IS NOT NULL
ORDER BY recurring_task_id, date;

-- Also check tasks without recurring_task_id
SELECT 
    title,
    date,
    COUNT(*) as duplicate_count
FROM tasks_items 
WHERE recurring_task_id IS NULL
GROUP BY title, description, project_id, priority, tag, todos
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, title;
