import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday, isThisWeek, isThisMonth, isThisYear } from 'date-fns'
import { ru } from 'date-fns/locale'

// Date formatting utilities
export const dateFormats = {
  short: 'dd.MM.yyyy',
  long: 'dd MMMM yyyy',
  time: 'HH:mm',
  datetime: 'dd.MM.yyyy HH:mm',
  month: 'MMMM yyyy',
  year: 'yyyy'
} as const

export function formatDate(date: Date | string, formatStr: keyof typeof dateFormats = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, dateFormats[formatStr], { locale: ru })
}

export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isToday(dateObj)) {
    return 'Сегодня'
  }
  
  if (isThisWeek(dateObj)) {
    return format(dateObj, 'EEEE', { locale: ru })
  }
  
  if (isThisMonth(dateObj)) {
    return format(dateObj, 'd MMMM', { locale: ru })
  }
  
  if (isThisYear(dateObj)) {
    return format(dateObj, 'd MMM', { locale: ru })
  }
  
  return format(dateObj, 'd MMM yyyy', { locale: ru })
}

// Week navigation utilities
export function getWeekRange(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 }) // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return { start, end }
}

export function getNextWeek(date: Date): Date {
  return addWeeks(date, 1)
}

export function getPrevWeek(date: Date): Date {
  return subWeeks(date, 1)
}

// Date validation utilities
export function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime())
}

export function isValidDateString(dateString: string): boolean {
  const date = new Date(dateString)
  return isValidDate(date)
}

// Date comparison utilities
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return format(date1, 'yyyy-MM-dd') === format(date2, 'yyyy-MM-dd')
}

// Business date utilities
export function getWorkingDaysInMonth(year: number, month: number): number {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)
  let workingDays = 0
  
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      workingDays++
    }
  }
  
  return workingDays
}

// Timezone utilities
export function toLocalDate(utcDate: string): Date {
  return new Date(utcDate + 'Z') // Add Z to ensure UTC parsing
}

export function toUTCString(date: Date): string {
  return date.toISOString().slice(0, -1) // Remove Z suffix
}
