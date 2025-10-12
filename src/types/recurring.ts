export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type RecurringTask = {
  id: string
  user_id: string
  title: string
  description?: string
  priority?: string
  tag?: string
  todos?: Array<{ id: string; text: string; done: boolean }>
  project_id?: string | null
  
  // Recurrence settings
  recurrence_type: RecurrenceType
  recurrence_interval: number // every N days/weeks/months/years
  recurrence_day_of_week?: number // 0-6 for weekly (0=Sunday)
  recurrence_day_of_month?: number // 1-31 for monthly
  recurrence_month_of_year?: number // 1-12 for yearly
  
  // Date settings
  start_date: string
  end_date?: string | null
  next_occurrence: string
  
  // Metadata
  created_at?: string
  updated_at?: string
  is_active: boolean
}

export type RecurringTaskSettings = {
  isRecurring: boolean
  recurrenceType?: RecurrenceType
  recurrenceInterval?: number
  recurrenceDayOfWeek?: number
  recurrenceDayOfMonth?: number
  recurrenceMonthOfYear?: number
  endDate?: string | null
}

export type RecurringTaskInstance = {
  id: string
  recurring_task_id: string
  original_date: string
  generated_date: string
  is_manually_modified: boolean
}
