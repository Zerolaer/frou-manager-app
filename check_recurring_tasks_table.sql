-- Check what's in the recurring_tasks table
SELECT 'recurring_tasks table contents:' as info;
SELECT 
  id,
  title,
  recurrence_type,
  recurrence_interval,
  recurrence_day_of_week,
  recurrence_day_of_month,
  start_date,
  is_active,
  created_at
FROM recurring_tasks 
ORDER BY created_at DESC;

-- Check if tasks_items have corresponding records in recurring_tasks
SELECT 'tasks_items with recurring_task_id:' as info;
SELECT 
  ti.recurring_task_id,
  ti.title,
  COUNT(*) as task_count,
  MIN(ti.date) as first_date,
  MAX(ti.date) as last_date
FROM tasks_items ti
WHERE ti.recurring_task_id IS NOT NULL
GROUP BY ti.recurring_task_id, ti.title
ORDER BY task_count DESC;

-- Check if there are tasks_items that don't have corresponding recurring_tasks records
SELECT 'tasks_items without recurring_tasks records:' as info;
SELECT 
  ti.recurring_task_id,
  ti.title,
  COUNT(*) as task_count
FROM tasks_items ti
LEFT JOIN recurring_tasks rt ON ti.recurring_task_id = rt.id::text
WHERE ti.recurring_task_id IS NOT NULL 
  AND rt.id IS NULL
GROUP BY ti.recurring_task_id, ti.title;
