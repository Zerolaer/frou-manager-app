-- Make project_id nullable in tasks_items table
-- This allows creating tasks without assigning them to a specific project

ALTER TABLE tasks_items 
ALTER COLUMN project_id DROP NOT NULL;

-- Add a comment to document this change
COMMENT ON COLUMN tasks_items.project_id IS 'Project ID (nullable) - tasks can exist without a project';

