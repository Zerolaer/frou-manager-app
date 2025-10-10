import { TASK_PRIORITIES, TASK_STATUSES } from './constants'
import { format } from 'date-fns'

/**
 * Get priority color scheme for task badges
 */
export function getPriorityColor(priority?: string | null): { background: string; text: string } {
  switch (priority) {
    case TASK_PRIORITIES.HIGH:
      return { background: '#fee2e2', text: '#dc2626' } // red
    case TASK_PRIORITIES.MEDIUM:
      return { background: '#fed7aa', text: '#ea580c' } // orange
    case TASK_PRIORITIES.LOW:
      return { background: '#dcfce7', text: '#16a34a' } // green
    default:
      return { background: '#f3f4f6', text: '#6b7280' } // gray default
  }
}

/**
 * Get priority display text
 */
export function getPriorityText(priority?: string | null): string | null {
  switch (priority) {
    case TASK_PRIORITIES.HIGH:
      return 'High'
    case TASK_PRIORITIES.MEDIUM:
      return 'Medium'
    case TASK_PRIORITIES.LOW:
      return 'Low'
    case TASK_PRIORITIES.NORMAL:
      return 'Normal'
    default:
      return null
  }
}

/**
 * Get status color for task status indicators
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case TASK_STATUSES.OPEN:
      return '#3b82f6' // blue
    case TASK_STATUSES.CLOSED:
      return '#10b981' // green
    default:
      return '#6b7280' // gray
  }
}

/**
 * Format task date for display
 */
export function formatTaskDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'MMM d, yyyy')
}

/**
 * Calculate task completion percentage
 */
export function getTaskCompletionPercentage(todos?: Array<{ done: boolean }>): number {
  if (!todos || todos.length === 0) return 0
  const completed = todos.filter((t) => t.done).length
  return Math.round((completed / todos.length) * 100)
}

/**
 * Check if task has overdue status
 */
export function isTaskOverdue(date: string | Date, status: string): boolean {
  if (status === TASK_STATUSES.CLOSED) return false
  const taskDate = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return taskDate < today
}

