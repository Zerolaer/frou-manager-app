-- Create recurring_tasks table
CREATE TABLE IF NOT EXISTS recurring_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT,
  tag TEXT,
  todos JSONB DEFAULT '[]'::jsonb,
  project_id UUID,
  
  -- Recurrence settings
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  recurrence_interval INTEGER NOT NULL DEFAULT 1 CHECK (recurrence_interval > 0),
  recurrence_day_of_week INTEGER CHECK (recurrence_day_of_week >= 0 AND recurrence_day_of_week <= 6),
  recurrence_day_of_month INTEGER CHECK (recurrence_day_of_month >= 1 AND recurrence_day_of_month <= 31),
  recurrence_month_of_year INTEGER CHECK (recurrence_month_of_year >= 1 AND recurrence_month_of_year <= 12),
  
  -- Date settings
  start_date DATE NOT NULL,
  end_date DATE,
  next_occurrence DATE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_user_id ON recurring_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_active ON recurring_tasks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_next_occurrence ON recurring_tasks(next_occurrence) WHERE is_active = true;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_recurring_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recurring_tasks_updated_at
  BEFORE UPDATE ON recurring_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_tasks_updated_at();

-- Add comments
COMMENT ON TABLE recurring_tasks IS 'Recurring task templates';
COMMENT ON COLUMN recurring_tasks.recurrence_type IS 'Type of recurrence: daily, weekly, monthly, yearly';
COMMENT ON COLUMN recurring_tasks.recurrence_interval IS 'Interval for recurrence (e.g., every 2 days)';
COMMENT ON COLUMN recurring_tasks.recurrence_day_of_week IS 'Day of week for weekly recurrence (0=Sunday, 1=Monday, etc.)';
COMMENT ON COLUMN recurring_tasks.recurrence_day_of_month IS 'Day of month for monthly recurrence (1-31)';
COMMENT ON COLUMN recurring_tasks.recurrence_month_of_year IS 'Month of year for yearly recurrence (1-12)';
COMMENT ON COLUMN recurring_tasks.next_occurrence IS 'Next date when task should be generated';
