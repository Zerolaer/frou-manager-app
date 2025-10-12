-- Check the actual recurrence settings in recurring_tasks table
SELECT 'Current recurrence settings in recurring_tasks:' as info;
SELECT 
  rt.id,
  rt.title,
  rt.recurrence_type,
  rt.recurrence_interval,
  rt.recurrence_day_of_week,
  rt.recurrence_day_of_month,
  rt.start_date,
  rt.is_active,
  rt.created_at
FROM recurring_tasks rt
ORDER BY rt.created_at DESC;

-- Check if monthly tasks are correctly identified
SELECT 'Monthly tasks analysis:' as info;
SELECT 
  ti.recurring_task_id,
  ti.title,
  COUNT(*) as task_count,
  COUNT(DISTINCT EXTRACT(day FROM ti.date::date)) as unique_days_of_month,
  STRING_AGG(DISTINCT EXTRACT(day FROM ti.date::date)::text, ', ' ORDER BY EXTRACT(day FROM ti.date::date)::text) as days_of_month_list,
  MIN(ti.date::date) as first_date,
  MAX(ti.date::date) as last_date
FROM tasks_items ti
WHERE ti.recurring_task_id IS NOT NULL
GROUP BY ti.recurring_task_id, ti.title
HAVING COUNT(DISTINCT EXTRACT(day FROM ti.date::date)) = 1  -- Only tasks with same day of month
ORDER BY task_count DESC;
