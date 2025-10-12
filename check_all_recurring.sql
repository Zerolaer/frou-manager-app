-- Check all recurring tasks in the database

-- 1. Show all tasks with recurring_task_id (grouped)
SELECT 
    title,
    COUNT(*) as task_count,
    MIN(date) as first_date,
    MAX(date) as last_date,
    recurring_task_id,
    -- Show date range in days
    (MAX(date) - MIN(date))::int as date_range_days,
    -- Show frequency (tasks per day on average)
    ROUND(COUNT(*)::numeric / NULLIF((MAX(date) - MIN(date))::int, 0) * 365, 2) as tasks_per_year
FROM tasks_items 
WHERE recurring_task_id IS NOT NULL
GROUP BY title, recurring_task_id
ORDER BY task_count DESC, first_date;

-- 2. Show detailed breakdown by recurring group
SELECT 
    '=== RECURRING GROUP: ' || title || ' ===' as group_info,
    '' as spacer1,
    '' as spacer2,
    '' as spacer3
FROM tasks_items 
WHERE recurring_task_id IS NOT NULL
GROUP BY title, recurring_task_id

UNION ALL

SELECT 
    'Task ID: ' || id::text as task_id,
    'Date: ' || date::text as task_date,
    'Status: ' || COALESCE(status, 'open') as task_status,
    'Project: ' || COALESCE(project_id::text, 'none') as project_info
FROM tasks_items 
WHERE recurring_task_id IS NOT NULL
ORDER BY group_info, spacer1;

-- 3. Summary statistics
SELECT 
    'SUMMARY' as info,
    COUNT(DISTINCT recurring_task_id) as total_recurring_groups,
    COUNT(*) as total_recurring_tasks,
    MIN(date) as earliest_date,
    MAX(date) as latest_date,
    ROUND(AVG(group_size), 1) as avg_tasks_per_group
FROM (
    SELECT 
        recurring_task_id,
        COUNT(*) as group_size,
        MIN(date) as date
    FROM tasks_items 
    WHERE recurring_task_id IS NOT NULL
    GROUP BY recurring_task_id
) as groups;
