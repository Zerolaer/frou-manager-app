// Types for Habits feature

export type HabitType = 'automatic' | 'manual' | 'progress'

export type Habit = {
  id: string
  user_id: string
  title: string
  type: HabitType
  start_date: string // ISO date string
  end_date?: string | null // ISO date string, optional
  initial_value?: number | null // For progress type
  target_value?: number | null // For progress type
  current_value?: number | null // For progress type (calculated from entries)
  created_at: string
  updated_at: string
}

export type HabitEntry = {
  id: string
  habit_id: string
  date: string // ISO date string (YYYY-MM-DD)
  value?: number | null // For progress type - incremental value
  created_at: string
}

export type HabitWithStats = Habit & {
  days_count?: number // For automatic type - days since start
  completion_count?: number // For manual type - total completions
  last_completion_date?: string | null // Last completion date
  streak_days?: number // Current streak
  progress_percentage?: number // For progress type
}
