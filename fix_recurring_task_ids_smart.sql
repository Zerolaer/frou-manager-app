-- Smart fix for recurring_task_id values
-- This script analyzes task dates to determine the actual recurrence pattern

-- First, let's see what we have
SELECT 'Current recurring_task_id values:' as info;
SELECT DISTINCT recurring_task_id, COUNT(*) as task_count 
FROM tasks_items 
WHERE recurring_task_id IS NOT NULL 
GROUP BY recurring_task_id 
ORDER BY task_count DESC;

-- Step 1: Update tasks_items to use UUID format for recurring_task_id (only for non-UUID values)
WITH old_to_new_mapping AS (
  SELECT 
    DISTINCT recurring_task_id as old_id,
    gen_random_uuid()::text as new_id
  FROM tasks_items 
  WHERE recurring_task_id IS NOT NULL 
    AND recurring_task_id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
)
UPDATE tasks_items 
SET recurring_task_id = mapping.new_id
FROM old_to_new_mapping mapping
WHERE tasks_items.recurring_task_id = mapping.old_id;

-- Step 2: Analyze recurrence patterns and create smart records in recurring_tasks
WITH recurrence_analysis AS (
  SELECT 
    ti.recurring_task_id,
    ti.user_id,
    ti.title,
    ti.description,
    ti.priority,
    ti.tag,
    ti.todos,
    ti.project_id,
    COUNT(*) as task_count,
    MIN(ti.date::date) as first_date,
    MAX(ti.date::date) as last_date,
    -- Calculate date differences to determine pattern
    CASE 
      -- Daily: tasks on consecutive days or every few days
      WHEN COUNT(*) >= 3 AND 
           (MAX(ti.date::date) - MIN(ti.date::date)) <= INTERVAL '1 day' * COUNT(*) * 2
      THEN 'daily'
      
      -- Weekly: tasks roughly every 7 days
      WHEN COUNT(*) >= 2 AND 
           (MAX(ti.date::date) - MIN(ti.date::date)) / GREATEST(COUNT(*) - 1, 1) BETWEEN INTERVAL '6 days' AND INTERVAL '8 days'
      THEN 'weekly'
      
      -- Monthly: tasks roughly every 30 days or on same day of month
      WHEN COUNT(*) >= 2 AND (
        (MAX(ti.date::date) - MIN(ti.date::date)) / GREATEST(COUNT(*) - 1, 1) BETWEEN INTERVAL '28 days' AND INTERVAL '35 days'
        OR COUNT(DISTINCT EXTRACT(day FROM ti.date::date)) = 1  -- Same day of month
      )
      THEN 'monthly'
      
      -- Yearly: tasks roughly every 365 days
      WHEN COUNT(*) >= 2 AND 
           (MAX(ti.date::date) - MIN(ti.date::date)) / GREATEST(COUNT(*) - 1, 1) BETWEEN INTERVAL '360 days' AND INTERVAL '370 days'
      THEN 'yearly'
      
      -- Default to weekly if unclear
      ELSE 'weekly'
    END as detected_type,
    
    -- Calculate interval (simplified)
    CASE 
      WHEN COUNT(*) >= 2 THEN 
        GREATEST(1, ROUND(EXTRACT(epoch FROM (MAX(ti.date::date) - MIN(ti.date::date))) / 86400 / GREATEST(COUNT(*) - 1, 1)))
      ELSE 1
    END as detected_interval,
    
    -- Extract day of week (0=Sunday, 1=Monday, etc.)
    EXTRACT(dow FROM MIN(ti.date::date)) as day_of_week,
    
    -- Extract day of month
    EXTRACT(day FROM MIN(ti.date::date)) as day_of_month
    
  FROM tasks_items ti
  WHERE ti.recurring_task_id IS NOT NULL
  GROUP BY ti.recurring_task_id, ti.user_id, ti.title, ti.description, ti.priority, ti.tag, ti.todos, ti.project_id
)

-- Insert into recurring_tasks with smart detection
INSERT INTO recurring_tasks (
  id, user_id, title, description, priority, tag, todos, project_id,
  recurrence_type, recurrence_interval, recurrence_day_of_week, recurrence_day_of_month,
  start_date, is_active
)
SELECT 
  ra.recurring_task_id::uuid as id,
  ra.user_id,
  ra.title,
  ra.description,
  ra.priority,
  ra.tag,
  ra.todos,
  ra.project_id,
  ra.detected_type as recurrence_type,
  ra.detected_interval::INTEGER as recurrence_interval,
  CASE 
    WHEN ra.detected_type = 'weekly' THEN ra.day_of_week::INTEGER
    ELSE NULL::INTEGER
  END as recurrence_day_of_week,
  CASE 
    WHEN ra.detected_type = 'monthly' THEN ra.day_of_month::INTEGER
    ELSE NULL::INTEGER
  END as recurrence_day_of_month,
  ra.first_date as start_date,
  true as is_active
FROM recurrence_analysis ra
WHERE ra.recurring_task_id::uuid NOT IN (SELECT id FROM recurring_tasks)
ON CONFLICT (id) DO UPDATE SET
  recurrence_type = EXCLUDED.recurrence_type,
  recurrence_interval = EXCLUDED.recurrence_interval,
  recurrence_day_of_week = EXCLUDED.recurrence_day_of_week,
  recurrence_day_of_month = EXCLUDED.recurrence_day_of_month,
  updated_at = NOW();

-- Show analysis results
SELECT 'Recurrence Analysis Results:' as info;
SELECT 
  rt.id,
  rt.title,
  rt.recurrence_type,
  rt.recurrence_interval,
  rt.recurrence_day_of_week,
  rt.recurrence_day_of_month,
  rt.start_date,
  COUNT(ti.id) as task_count
FROM recurring_tasks rt
LEFT JOIN tasks_items ti ON ti.recurring_task_id = rt.id::text
GROUP BY rt.id, rt.title, rt.recurrence_type, rt.recurrence_interval, 
         rt.recurrence_day_of_week, rt.recurrence_day_of_month, rt.start_date
ORDER BY rt.created_at DESC;

-- Verify the results
SELECT 'Final verification - recurring_task_id values:' as info;
SELECT DISTINCT recurring_task_id, COUNT(*) as task_count 
FROM tasks_items 
WHERE recurring_task_id IS NOT NULL 
GROUP BY recurring_task_id 
ORDER BY task_count DESC;
