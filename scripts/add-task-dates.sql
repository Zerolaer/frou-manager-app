-- Add start_date and due_date fields to tasks_items table for Gantt chart support
-- Execute this in Supabase SQL Editor

-- Add start_date column if it doesn't exist
ALTER TABLE public.tasks_items 
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Add due_date column if it doesn't exist
ALTER TABLE public.tasks_items 
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN public.tasks_items.start_date IS 'Start date for Gantt chart view';
COMMENT ON COLUMN public.tasks_items.due_date IS 'Due date for Gantt chart view';

