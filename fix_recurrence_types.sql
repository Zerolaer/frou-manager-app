-- Fix recurrence types in recurring_tasks table based on actual task patterns

-- First, show current settings
SELECT 'Current recurrence settings (BEFORE UPDATE):' as info;
SELECT 
  rt.id,
  rt.title,
  rt.recurrence_type,
  rt.recurrence_interval,
  rt.recurrence_day_of_week,
  rt.recurrence_day_of_month
FROM recurring_tasks rt
ORDER BY rt.title;

-- Update recurrence_type to 'monthly' for tasks that occur on the same day of month
UPDATE recurring_tasks 
SET 
  recurrence_type = 'monthly',
  recurrence_day_of_month = EXTRACT(day FROM start_date)::INTEGER,
  recurrence_day_of_week = NULL,
  updated_at = NOW()
WHERE id IN (
  SELECT rt.id
  FROM recurring_tasks rt
  JOIN tasks_items ti ON ti.recurring_task_id = rt.id::text
  WHERE rt.recurrence_type = 'weekly'
  GROUP BY rt.id, rt.title, rt.start_date
  HAVING COUNT(DISTINCT EXTRACT(day FROM ti.date::date)) = 1
);

-- Show updated settings
SELECT 'Updated recurrence settings (AFTER UPDATE):' as info;
SELECT 
  rt.id,
  rt.title,
  rt.recurrence_type,
  rt.recurrence_interval,
  rt.recurrence_day_of_week,
  rt.recurrence_day_of_month,
  rt.updated_at
FROM recurring_tasks rt
ORDER BY rt.title;

-- Verify the update worked
SELECT 'Verification - Monthly tasks:' as info;
SELECT 
  rt.id,
  rt.title,
  rt.recurrence_type,
  rt.recurrence_day_of_month,
  COUNT(ti.id) as task_count,
  STRING_AGG(DISTINCT EXTRACT(day FROM ti.date::date)::text, ', ' ORDER BY EXTRACT(day FROM ti.date::date)::text) as actual_days
FROM recurring_tasks rt
JOIN tasks_items ti ON ti.recurring_task_id = rt.id::text
WHERE rt.recurrence_type = 'monthly'
GROUP BY rt.id, rt.title, rt.recurrence_type, rt.recurrence_day_of_month
ORDER BY rt.title;
