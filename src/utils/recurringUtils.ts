import { RecurringTask, RecurrenceType, RecurringTaskSettings } from '@/types/recurring'

/**
 * Calculate the next occurrence date for a recurring task
 */
export function calculateNextOccurrence(
  currentDate: Date,
  recurrenceType: RecurrenceType,
  interval: number = 1,
  dayOfWeek?: number,
  dayOfMonth?: number,
  monthOfYear?: number
): Date {
  const next = new Date(currentDate)
  
  switch (recurrenceType) {
    case 'daily':
      next.setDate(next.getDate() + interval)
      break
      
    case 'weekly':
      next.setDate(next.getDate() + (interval * 7))
      if (dayOfWeek !== undefined) {
        // Adjust to the specific day of week
        const currentDay = next.getDay()
        const daysToAdd = (dayOfWeek - currentDay + 7) % 7
        next.setDate(next.getDate() + daysToAdd)
      }
      break
      
    case 'monthly':
      // Store the current day
      const currentDay = next.getDate()
      next.setMonth(next.getMonth() + interval)
      
      if (dayOfMonth !== undefined) {
        // Use the specified day of month
        const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        const targetDay = Math.min(dayOfMonth, lastDayOfMonth)
        next.setDate(targetDay)
      } else {
        // Try to keep the same day of month
        const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        const targetDay = Math.min(currentDay, lastDayOfMonth)
        next.setDate(targetDay)
      }
      break
      
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval)
      if (monthOfYear !== undefined) {
        next.setMonth(monthOfYear - 1) // monthOfYear is 1-12, setMonth expects 0-11
      }
      if (dayOfMonth !== undefined) {
        // Ensure the day exists in the target month
        const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        const targetDay = Math.min(dayOfMonth, lastDayOfMonth)
        next.setDate(targetDay)
      }
      break
  }
  
  return next
}

/**
 * Generate task instances for a recurring task within a date range
 */
export function generateTaskInstances(
  recurringTask: RecurringTask,
  startDate: Date,
  endDate: Date
): Array<{ date: string; isGenerated: boolean }> {
  const instances: Array<{ date: string; isGenerated: boolean }> = []
  
  let currentDate = new Date(recurringTask.start_date)
  const taskEndDate = recurringTask.end_date ? new Date(recurringTask.end_date) : null
  
  while (currentDate <= endDate) {
    // Check if we're within the date range and before end date
    if (currentDate >= startDate && (!taskEndDate || currentDate <= taskEndDate)) {
      instances.push({
        date: currentDate.toISOString().split('T')[0],
        isGenerated: true
      })
    }
    
    // Calculate next occurrence
    currentDate = calculateNextOccurrence(
      currentDate,
      recurringTask.recurrence_type,
      recurringTask.recurrence_interval,
      recurringTask.recurrence_day_of_week,
      recurringTask.recurrence_day_of_month,
      recurringTask.recurrence_month_of_year
    )
    
    // Safety check to prevent infinite loops
    if (currentDate <= new Date(recurringTask.start_date)) {
      break
    }
  }
  
  return instances
}

/**
 * Get human-readable description of recurrence pattern
 */
export function getRecurrenceDescription(
  type: RecurrenceType,
  interval: number = 1,
  dayOfWeek?: number,
  dayOfMonth?: number,
  monthOfYear?: number
): string {
  // Return English descriptions for now
  // TODO: Implement proper i18n in the component that calls this function
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  
  switch (type) {
    case 'daily':
      return interval === 1 ? 'Daily' : `Every ${interval} days`
      
    case 'weekly':
      if (dayOfWeek !== undefined) {
        const dayName = dayNames[dayOfWeek]
        return interval === 1 ? `Weekly on ${dayName}` : `Every ${interval} weeks on ${dayName}`
      }
      return interval === 1 ? 'Weekly' : `Every ${interval} weeks`
      
    case 'monthly':
      if (dayOfMonth !== undefined) {
        return interval === 1 
          ? `Monthly on day ${dayOfMonth}` 
          : `Every ${interval} months on day ${dayOfMonth}`
      }
      return interval === 1 ? 'Monthly' : `Every ${interval} months`
      
    case 'yearly':
      if (monthOfYear !== undefined && dayOfMonth !== undefined) {
        const monthName = monthNames[monthOfYear - 1]
        return interval === 1 
          ? `Yearly on ${dayOfMonth} ${monthName}` 
          : `Every ${interval} years on ${dayOfMonth} ${monthName}`
      }
      return interval === 1 ? 'Yearly' : `Every ${interval} years`
      
    default:
      return 'Recurring task'
  }
}

/**
 * Validate recurrence settings
 */
export function validateRecurrenceSettings(settings: {
  type: RecurrenceType
  interval: number
  dayOfWeek?: number
  dayOfMonth?: number
  monthOfYear?: number
  endDate?: string
}): { isValid: boolean; error?: string } {
  const { type, interval, dayOfWeek, dayOfMonth, monthOfYear, endDate } = settings
  
  // Validate interval
  if (interval < 1 || interval > 999) {
    return { isValid: false, error: 'Интервал должен быть от 1 до 999' }
  }
  
  // Validate type-specific settings
  switch (type) {
    case 'weekly':
      if (dayOfWeek !== undefined && (dayOfWeek < 0 || dayOfWeek > 6)) {
        return { isValid: false, error: 'День недели должен быть от 0 до 6' }
      }
      break
      
    case 'monthly':
      if (dayOfMonth !== undefined && (dayOfMonth < 1 || dayOfMonth > 31)) {
        return { isValid: false, error: 'День месяца должен быть от 1 до 31' }
      }
      break
      
    case 'yearly':
      if (monthOfYear !== undefined && (monthOfYear < 1 || monthOfYear > 12)) {
        return { isValid: false, error: 'Месяц должен быть от 1 до 12' }
      }
      if (dayOfMonth !== undefined && (dayOfMonth < 1 || dayOfMonth > 31)) {
        return { isValid: false, error: 'День месяца должен быть от 1 до 31' }
      }
      break
  }
  
  // Validate end date
  if (endDate) {
    const end = new Date(endDate)
    const today = new Date()
    if (end <= today) {
      return { isValid: false, error: 'Дата окончания должна быть в будущем' }
    }
  }
  
  return { isValid: true }
}

/**
 * Generate recurring task instances for the next 6 months
 */
export function generateRecurringTaskInstances(
  startDate: Date,
  recurringSettings: RecurringTaskSettings
): Array<{ date: string; isGenerated: boolean }> {
  if (!recurringSettings.isRecurring || !recurringSettings.recurrenceType) {
    return []
  }

  const instances: Array<{ date: string; isGenerated: boolean }> = []
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 6) // Generate for next 6 months

  let currentDate = new Date(startDate)
  const taskEndDate = recurringSettings.endDate ? new Date(recurringSettings.endDate) : null

  while (currentDate <= endDate) {
    // Check if we're before end date
    if (!taskEndDate || currentDate <= taskEndDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      instances.push({
        date: dateStr,
        isGenerated: true
      })
    }

    // Calculate next occurrence
    currentDate = calculateNextOccurrence(
      currentDate,
      recurringSettings.recurrenceType,
      recurringSettings.recurrenceInterval || 1,
      recurringSettings.recurrenceDayOfWeek,
      recurringSettings.recurrenceDayOfMonth,
      recurringSettings.recurrenceMonthOfYear
    )

    // Safety check to prevent infinite loops
    if (currentDate <= new Date(startDate)) {
      break
    }
  }

  return instances
}
