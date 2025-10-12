-- Smart approach: Only group tasks that are likely to be truly recurring
-- Criteria: Same title + dates that follow a pattern (daily, weekly, monthly)

-- Step 1: Clear all existing recurring_task_id (reset)
UPDATE tasks_items SET recurring_task_id = NULL;

-- Step 2: Identify truly recurring tasks based on date patterns
WITH task_groups AS (
    SELECT 
        title,
        description,
        project_id,
        priority,
        tag,
        todos,
        array_agg(DISTINCT date ORDER BY date) as dates,
        COUNT(*) as task_count,
        MIN(date) as first_date,
        MAX(date) as last_date
    FROM tasks_items 
    GROUP BY title, description, project_id, priority, tag, todos
    HAVING COUNT(*) >= 3  -- At least 3 tasks to be considered recurring
),
recurring_candidates AS (
    SELECT *,
        -- Check if dates follow daily pattern (consecutive days)
        CASE 
            WHEN task_count >= 3 AND 
                 (last_date - first_date)::int <= task_count * 2 AND  -- Reasonable date range
                 task_count >= (last_date - first_date)::int / 2  -- At least half the days covered
            THEN true
            ELSE false
        END as is_daily_pattern,
        
        -- Check if dates follow weekly pattern (weekly intervals)
        CASE 
            WHEN task_count >= 3 AND 
                 (last_date - first_date)::int >= task_count * 5 AND  -- At least weekly spacing
                 task_count >= (last_date - first_date)::int / 10  -- Reasonable weekly frequency
            THEN true
            ELSE false
        END as is_weekly_pattern,
        
        -- Check if dates follow monthly pattern (monthly intervals)
        CASE 
            WHEN task_count >= 3 AND 
                 (last_date - first_date)::int >= task_count * 25 AND  -- At least monthly spacing
                 task_count >= (last_date - first_date)::int / 40  -- Reasonable monthly frequency
            THEN true
            ELSE false
        END as is_monthly_pattern
        
    FROM task_groups
),
likely_recurring AS (
    SELECT 
        title,
        description,
        project_id,
        priority,
        tag,
        todos,
        first_date,
        task_count,
        'recurring_' || EXTRACT(EPOCH FROM first_date::timestamp)::text || '_' || 
        MD5(title || COALESCE(description, '') || project_id::text) as recurring_id
    FROM recurring_candidates
    WHERE is_daily_pattern = true 
       OR is_weekly_pattern = true 
       OR is_monthly_pattern = true
)
-- Step 3: Show what will be marked as recurring
SELECT 
    title,
    task_count,
    first_date,
    recurring_id
FROM likely_recurring
ORDER BY task_count DESC;

-- Step 4: Update only likely recurring tasks
WITH likely_recurring AS (
    SELECT 
        title,
        description,
        project_id,
        priority,
        tag,
        todos,
        MIN(date) as first_date,
        COUNT(*) as task_count,
        'recurring_' || EXTRACT(EPOCH FROM MIN(date)::timestamp)::text || '_' || 
        MD5(title || COALESCE(description, '') || project_id::text) as recurring_id
    FROM tasks_items 
    GROUP BY title, description, project_id, priority, tag, todos
    HAVING COUNT(*) >= 3  -- At least 3 tasks
        AND (MAX(date) - MIN(date))::int >= COUNT(*) * 2  -- Reasonable date spread
        AND COUNT(*) >= (MAX(date) - MIN(date))::int / 10  -- Reasonable frequency
)
UPDATE tasks_items 
SET recurring_task_id = likely_recurring.recurring_id
FROM likely_recurring
WHERE tasks_items.title = likely_recurring.title
  AND tasks_items.description = likely_recurring.description
  AND tasks_items.project_id = likely_recurring.project_id
  AND tasks_items.priority = likely_recurring.priority
  AND tasks_items.tag = likely_recurring.tag
  AND tasks_items.todos = likely_recurring.todos;

-- Step 5: Show final results
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
