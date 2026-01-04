import { RecurringTask, RecurrenceType, RecurringTaskSettings } from '@/types/recurring'
import { format } from 'date-fns'

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
  
  // Start from the recurring task's start_date, not from the passed startDate
  // This ensures we generate all instances according to the recurrence pattern
  // CRITICAL: Parse date in local timezone to avoid UTC shift
  const startDateStr = recurringTask.start_date
  const [year, month, day] = startDateStr.split('-').map(Number)
  let currentDate = new Date(year, month - 1, day) // month is 0-indexed, parse in local timezone
  currentDate.setHours(0, 0, 0, 0) // Normalize to start of day
  
  console.log(`📅 generateTaskInstances: Parsed start_date "${startDateStr}" -> ${format(currentDate, 'yyyy-MM-dd')} (day=${currentDate.getDate()})`)
  
  // CRITICAL FIX: For monthly tasks with dayOfMonth, adjust the date FIRST
  // Same logic as in generateRecurringTaskInstances
  if (recurringTask.recurrence_type === 'monthly' && recurringTask.recurrence_day_of_month !== undefined) {
    const dayOfMonth = recurringTask.recurrence_day_of_month
    const currentDay = currentDate.getDate()
    
    console.log(`📅 generateTaskInstances: Monthly task "${recurringTask.title}", start_date=${format(currentDate, 'yyyy-MM-dd')} (day=${currentDay}), target dayOfMonth=${dayOfMonth}`)
    
    if (currentDay !== dayOfMonth) {
      console.log(`⚠️ MISMATCH: start_date day (${currentDay}) != dayOfMonth (${dayOfMonth}), adjusting...`)
      if (currentDay < dayOfMonth) {
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
        const targetDay = Math.min(dayOfMonth, lastDayOfMonth)
        console.log(`📅 Adjusting: ${currentDay} < ${dayOfMonth}, setting to ${targetDay} of current month`)
        currentDate.setDate(targetDay)
      } else {
        console.log(`📅 Adjusting: ${currentDay} > ${dayOfMonth}, moving to next month`)
        currentDate.setMonth(currentDate.getMonth() + 1)
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
        const targetDay = Math.min(dayOfMonth, lastDayOfMonth)
        currentDate.setDate(targetDay)
        console.log(`📅 Set to ${targetDay} of next month (${format(currentDate, 'yyyy-MM-dd')})`)
      }
    }
  }
  
  const taskEndDate = recurringTask.end_date ? new Date(recurringTask.end_date) : null
  taskEndDate?.setHours(23, 59, 59, 999) // End of day if exists
  
  const normalizedStartDate = new Date(startDate)
  normalizedStartDate.setHours(0, 0, 0, 0)
  const normalizedEndDate = new Date(endDate)
  normalizedEndDate.setHours(23, 59, 59, 999)
  
  // Safety counter to prevent infinite loops
  let iterations = 0
  const maxIterations = 10000
  
  while (currentDate <= normalizedEndDate && iterations < maxIterations) {
    iterations++
    
    // CRITICAL CHECK: For monthly tasks with dayOfMonth, verify the date matches
    let shouldAdd = true
    if (recurringTask.recurrence_type === 'monthly' && recurringTask.recurrence_day_of_month !== undefined) {
      const dayOfMonth = recurringTask.recurrence_day_of_month
      const currentDay = currentDate.getDate()
      if (currentDay !== dayOfMonth) {
        console.log(`❌ REJECTING date ${format(currentDate, 'yyyy-MM-dd')}: day=${currentDay} != dayOfMonth=${dayOfMonth}`)
        shouldAdd = false
      }
    }
    
    // Check if we're within the requested date range and before task end date
    if (shouldAdd && 
        currentDate >= normalizedStartDate && 
        currentDate <= normalizedEndDate && 
        (!taskEndDate || currentDate <= taskEndDate)) {
      // Format date in local timezone to avoid UTC shift issues
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      
      // Only add if not already in instances (prevent duplicates)
      if (!instances.some(inst => inst.date === dateStr)) {
        instances.push({
          date: dateStr,
          isGenerated: true
        })
        console.log(`✅ Added instance: ${dateStr}`)
      } else {
        console.log(`⏭️ Skipping duplicate: ${dateStr}`)
      }
    }
    
    // Calculate next occurrence
    const previousDate = new Date(currentDate)
    currentDate = calculateNextOccurrence(
      currentDate,
      recurringTask.recurrence_type,
      recurringTask.recurrence_interval,
      recurringTask.recurrence_day_of_week,
      recurringTask.recurrence_day_of_month,
      recurringTask.recurrence_month_of_year
    )
    
    // CRITICAL: For monthly tasks, verify the next occurrence also matches dayOfMonth
    if (recurringTask.recurrence_type === 'monthly' && recurringTask.recurrence_day_of_month !== undefined) {
      const dayOfMonth = recurringTask.recurrence_day_of_month
      const nextDay = currentDate.getDate()
      if (nextDay !== dayOfMonth) {
        console.log(`⚠️ Next occurrence ${format(currentDate, 'yyyy-MM-dd')} doesn't match dayOfMonth (${dayOfMonth}), correcting...`)
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
        const targetDay = Math.min(dayOfMonth, lastDayOfMonth)
        currentDate.setDate(targetDay)
        console.log(`✅ Corrected to ${format(currentDate, 'yyyy-MM-dd')}`)
      }
    }
    
    // Safety check: if we didn't advance, break to prevent infinite loop
    if (currentDate <= previousDate) {
      console.warn(`⚠️ Recurrence calculation didn't advance for task ${recurringTask.id}, breaking loop`)
      break
    }
    
    // Additional safety: if we've gone past the end date significantly, break
    if (currentDate > normalizedEndDate && currentDate > (taskEndDate || normalizedEndDate)) {
      break
    }
  }
  
  if (iterations >= maxIterations) {
    console.warn(`⚠️ Reached max iterations (${maxIterations}) for task ${recurringTask.id}`)
  }
  
  console.log(`📊 generateTaskInstances final instances:`, instances.map(i => i.date))
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

  // CRITICAL FIX: For monthly tasks with dayOfMonth, we MUST adjust the date FIRST
  // before adding to instances. We should NEVER add the startDate if it doesn't match the pattern.
  let currentDate = new Date(startDate)
  currentDate.setHours(0, 0, 0, 0)
  
  const originalStartDate = new Date(startDate)
  originalStartDate.setHours(0, 0, 0, 0)
  
  console.log(`🔍 generateRecurringTaskInstances called with startDate: ${format(originalStartDate, 'yyyy-MM-dd')}, recurrenceType: ${recurringSettings.recurrenceType}, dayOfMonth: ${recurringSettings.recurrenceDayOfMonth}`)
  
  // CRITICAL: For monthly tasks with dayOfMonth, ALWAYS adjust the date FIRST
  // We NEVER add the original startDate if it doesn't match dayOfMonth
  if (recurringSettings.recurrenceType === 'monthly' && recurringSettings.recurrenceDayOfMonth !== undefined) {
    const dayOfMonth = recurringSettings.recurrenceDayOfMonth
    const currentDay = currentDate.getDate()
    
    console.log(`📅 Monthly task: startDate=${format(originalStartDate, 'yyyy-MM-dd')} (day=${currentDay}), target dayOfMonth=${dayOfMonth}`)
    
    // ALWAYS adjust to match dayOfMonth - we NEVER use the original startDate if it doesn't match
    if (currentDay !== dayOfMonth) {
      console.log(`⚠️ MISMATCH: startDate day (${currentDay}) != dayOfMonth (${dayOfMonth}), adjusting...`)
      // If current day is before target day, set to target day of current month
      if (currentDay < dayOfMonth) {
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
        const targetDay = Math.min(dayOfMonth, lastDayOfMonth)
        console.log(`📅 Adjusting: ${currentDay} < ${dayOfMonth}, setting to ${targetDay} of current month`)
        currentDate.setDate(targetDay)
      } else {
        // If current day is after target day, set to target day of next month
        console.log(`📅 Adjusting: ${currentDay} > ${dayOfMonth}, moving to next month`)
        currentDate.setMonth(currentDate.getMonth() + 1)
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
        const targetDay = Math.min(dayOfMonth, lastDayOfMonth)
        currentDate.setDate(targetDay)
        console.log(`📅 Set to ${targetDay} of next month (${format(currentDate, 'yyyy-MM-dd')})`)
      }
    } else {
      console.log(`✅ Start date matches dayOfMonth (${dayOfMonth}), will use it`)
    }
    
    // VERIFY: After adjustment, currentDate MUST match dayOfMonth
    const finalDay = currentDate.getDate()
    if (finalDay !== dayOfMonth) {
      console.error(`❌ ERROR: After adjustment, date still doesn't match! ${format(currentDate, 'yyyy-MM-dd')} (day=${finalDay}) != dayOfMonth=${dayOfMonth}`)
      // Force correction
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
      const targetDay = Math.min(dayOfMonth, lastDayOfMonth)
      currentDate.setDate(targetDay)
      console.log(`🔧 Force corrected to ${format(currentDate, 'yyyy-MM-dd')}`)
    }
  }
  
  const taskEndDate = recurringSettings.endDate ? new Date(recurringSettings.endDate) : null
  taskEndDate?.setHours(23, 59, 59, 999)

  // Safety counter to prevent infinite loops
  let iterations = 0
  const maxIterations = 10000

  // CRITICAL: Start loop with the ADJUSTED currentDate, not the original startDate
  // This ensures we only add dates that match the recurrence pattern
  while (currentDate <= endDate && iterations < maxIterations) {
    iterations++
    
    // CRITICAL CHECK: For monthly tasks with dayOfMonth, verify the date matches
    let shouldAdd = true
    if (recurringSettings.recurrenceType === 'monthly' && recurringSettings.recurrenceDayOfMonth !== undefined) {
      const dayOfMonth = recurringSettings.recurrenceDayOfMonth
      const currentDay = currentDate.getDate()
      if (currentDay !== dayOfMonth) {
        console.log(`❌ REJECTING date ${format(currentDate, 'yyyy-MM-dd')}: day=${currentDay} != dayOfMonth=${dayOfMonth}`)
        shouldAdd = false
      } else {
        console.log(`✅ ACCEPTING date ${format(currentDate, 'yyyy-MM-dd')}: day=${currentDay} == dayOfMonth=${dayOfMonth}`)
      }
    }
    
    // Check if we're before end date
    if (shouldAdd && (!taskEndDate || currentDate <= taskEndDate)) {
      // Format date in local timezone to avoid UTC shift issues
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      
      // CRITICAL: Only add if not already in instances (prevent duplicates)
      if (!instances.some(inst => inst.date === dateStr)) {
        instances.push({
          date: dateStr,
          isGenerated: true
        })
        console.log(`✅ Added instance: ${dateStr}`)
      } else {
        console.log(`⏭️ Skipping duplicate: ${dateStr}`)
      }
    } else if (!shouldAdd) {
      console.log(`⏭️ Skipping date ${format(currentDate, 'yyyy-MM-dd')} - doesn't match pattern`)
    }

    // Calculate next occurrence
    const previousDate = new Date(currentDate)
    currentDate = calculateNextOccurrence(
      currentDate,
      recurringSettings.recurrenceType,
      recurringSettings.recurrenceInterval || 1,
      recurringSettings.recurrenceDayOfWeek,
      recurringSettings.recurrenceDayOfMonth,
      recurringSettings.recurrenceMonthOfYear
    )
    
    console.log(`📅 Next occurrence calculated: ${format(previousDate, 'yyyy-MM-dd')} -> ${format(currentDate, 'yyyy-MM-dd')}`)

    // Safety check to prevent infinite loops
    if (currentDate <= previousDate) {
      console.warn(`⚠️ Recurrence calculation didn't advance, breaking loop`)
      break
    }
    
    // CRITICAL: For monthly tasks, verify the next occurrence also matches dayOfMonth
    if (recurringSettings.recurrenceType === 'monthly' && recurringSettings.recurrenceDayOfMonth !== undefined) {
      const dayOfMonth = recurringSettings.recurrenceDayOfMonth
      const nextDay = currentDate.getDate()
      if (nextDay !== dayOfMonth) {
        console.log(`⚠️ Next occurrence ${format(currentDate, 'yyyy-MM-dd')} doesn't match dayOfMonth (${dayOfMonth}), correcting...`)
        // Correct the date to match dayOfMonth
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
        const targetDay = Math.min(dayOfMonth, lastDayOfMonth)
        currentDate.setDate(targetDay)
        console.log(`✅ Corrected to ${format(currentDate, 'yyyy-MM-dd')}`)
      }
    }
    
    // Additional safety: if we've gone past the end date significantly, break
    if (currentDate > endDate && currentDate > (taskEndDate || endDate)) {
      break
    }
  }

  if (iterations >= maxIterations) {
    console.warn(`⚠️ Reached max iterations (${maxIterations}) in generateRecurringTaskInstances`)
  }

  console.log(`📊 Final instances generated:`, instances.map(i => i.date))
  return instances
}
