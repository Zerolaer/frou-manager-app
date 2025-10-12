-- Fix recurring_task_id values that are not UUIDs
-- This script will update old string-based recurring_task_id values to proper UUIDs

-- First, let's see what we have
SELECT 'Current recurring_task_id values:' as info;
SELECT DISTINCT recurring_task_id, COUNT(*) as task_count 
FROM tasks_items 
WHERE recurring_task_id IS NOT NULL 
GROUP BY recurring_task_id 
ORDER BY task_count DESC;

-- Update tasks_items to use UUID format for recurring_task_id
-- We'll generate new UUIDs for existing string-based recurring_task_id values

-- Step 1: Create a mapping table for old to new IDs
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

-- Step 2: Create corresponding records in recurring_tasks table
-- For each unique recurring_task_id that doesn't have a corresponding record in recurring_tasks
INSERT INTO recurring_tasks (
  id, user_id, title, description, priority, tag, todos, project_id,
  recurrence_type, recurrence_interval, recurrence_day_of_week, recurrence_day_of_month,
  start_date, is_active
)
SELECT DISTINCT
  ti.recurring_task_id::uuid as id,
  ti.user_id,
  ti.title,
  ti.description,
  ti.priority,
  ti.tag,
  ti.todos,
  ti.project_id,
  'weekly' as recurrence_type, -- Default to weekly, user can update later
  1::INTEGER as recurrence_interval,
  1::INTEGER as recurrence_day_of_week, -- Default to Monday
  NULL::INTEGER as recurrence_day_of_month,
  MIN(ti.date::date) as start_date,
  true as is_active
FROM tasks_items ti
WHERE ti.recurring_task_id IS NOT NULL
  AND ti.recurring_task_id::uuid NOT IN (SELECT id FROM recurring_tasks)
GROUP BY ti.recurring_task_id, ti.user_id, ti.title, ti.description, ti.priority, ti.tag, ti.todos, ti.project_id
ON CONFLICT (id) DO NOTHING;

-- Verify the results
SELECT 'After update - recurring_task_id values:' as info;
SELECT DISTINCT recurring_task_id, COUNT(*) as task_count 
FROM tasks_items 
WHERE recurring_task_id IS NOT NULL 
GROUP BY recurring_task_id 
ORDER BY task_count DESC;

SELECT 'Recurring tasks table:' as info;
SELECT id, title, recurrence_type, recurrence_interval, is_active 
FROM recurring_tasks 
ORDER BY created_at DESC;
