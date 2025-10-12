-- Create missing records in recurring_tasks table for existing tasks_items

-- First, let's see what tasks need recurring_tasks records
SELECT 'Tasks that need recurring_tasks records:' as info;
SELECT 
  ti.recurring_task_id,
  ti.title,
  COUNT(*) as task_count,
  MIN(ti.date::date) as first_date,
  MAX(ti.date::date) as last_date,
  -- Determine if it's monthly based on day of month
  CASE 
    WHEN COUNT(DISTINCT EXTRACT(day FROM ti.date::date)) = 1 THEN 'monthly'
    ELSE 'weekly'
  END as detected_type,
  EXTRACT(day FROM MIN(ti.date::date)) as day_of_month,
  EXTRACT(dow FROM MIN(ti.date::date)) as day_of_week
FROM tasks_items ti
LEFT JOIN recurring_tasks rt ON ti.recurring_task_id = rt.id::text
WHERE ti.recurring_task_id IS NOT NULL 
  AND rt.id IS NULL
GROUP BY ti.recurring_task_id, ti.title, ti.user_id, ti.description, ti.priority, ti.tag, ti.todos, ti.project_id
ORDER BY task_count DESC;

-- Create the missing records
INSERT INTO recurring_tasks (
  id, user_id, title, description, priority, tag, todos, project_id,
  recurrence_type, recurrence_interval, recurrence_day_of_week, recurrence_day_of_month,
  start_date, is_active
)
SELECT 
  ti.recurring_task_id::uuid as id,
  ti.user_id,
  ti.title,
  ti.description,
  ti.priority,
  ti.tag,
  ti.todos,
  ti.project_id,
  -- Determine recurrence type based on day of month
  CASE 
    WHEN COUNT(DISTINCT EXTRACT(day FROM ti.date::date)) = 1 THEN 'monthly'
    ELSE 'weekly'
  END as recurrence_type,
  1::INTEGER as recurrence_interval,
  CASE 
    WHEN COUNT(DISTINCT EXTRACT(day FROM ti.date::date)) = 1 THEN NULL::INTEGER
    ELSE EXTRACT(dow FROM MIN(ti.date::date))::INTEGER
  END as recurrence_day_of_week,
  CASE 
    WHEN COUNT(DISTINCT EXTRACT(day FROM ti.date::date)) = 1 THEN EXTRACT(day FROM MIN(ti.date::date))::INTEGER
    ELSE NULL::INTEGER
  END as recurrence_day_of_month,
  MIN(ti.date::date) as start_date,
  true as is_active
FROM tasks_items ti
LEFT JOIN recurring_tasks rt ON ti.recurring_task_id = rt.id::text
WHERE ti.recurring_task_id IS NOT NULL 
  AND rt.id IS NULL
GROUP BY ti.recurring_task_id, ti.user_id, ti.title, ti.description, ti.priority, ti.tag, ti.todos, ti.project_id
ON CONFLICT (id) DO NOTHING;

-- Verify the results
SELECT 'Created recurring_tasks records:' as info;
SELECT 
  rt.id,
  rt.title,
  rt.recurrence_type,
  rt.recurrence_interval,
  rt.recurrence_day_of_week,
  rt.recurrence_day_of_month,
  rt.start_date,
  rt.is_active
FROM recurring_tasks rt
ORDER BY rt.created_at DESC;

-- Check if all tasks_items now have corresponding recurring_tasks records
SELECT 'Final verification - all tasks_items should have recurring_tasks records:' as info;
SELECT 
  ti.recurring_task_id,
  ti.title,
  COUNT(*) as task_count,
  CASE WHEN rt.id IS NOT NULL THEN 'HAS RECORD' ELSE 'MISSING RECORD' END as status
FROM tasks_items ti
LEFT JOIN recurring_tasks rt ON ti.recurring_task_id = rt.id::text
WHERE ti.recurring_task_id IS NOT NULL
GROUP BY ti.recurring_task_id, ti.title, rt.id
ORDER BY task_count DESC;
