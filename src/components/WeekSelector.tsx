import React from 'react'
import { Calendar } from 'lucide-react'
import { format, startOfWeek, endOfWeek, subWeeks, isSameWeek } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'
import { useSafeTranslation } from '@/utils/safeTranslation'
import Dropdown, { DropdownOption } from './ui/Dropdown'

interface WeekSelectorProps {
  selectedWeek: Date
  onWeekChange: (week: Date) => void
  maxWeeksBack?: number
}

export default function WeekSelector({ 
  selectedWeek, 
  onWeekChange, 
  maxWeeksBack = 3 
}: WeekSelectorProps) {
  const { t, i18n } = useSafeTranslation()
  const currentLanguage = i18n.language || 'en'
  const locale = currentLanguage === 'ru' ? ru : enUS

  // Generate week options (current week + maxWeeksBack weeks back)
  const generateWeekOptions = (): DropdownOption[] => {
    const options: DropdownOption[] = []
    const today = new Date()
    
    // Current week
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 })
    options.push({
      value: 0, // 0 weeks back
      label: t('weekSelector.currentWeek')
    })
    
    // Previous weeks
    for (let i = 1; i <= maxWeeksBack; i++) {
      const weekDate = subWeeks(today, i)
      const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 })
      
      options.push({
        value: i, // number of weeks back
        label: `${format(weekStart, 'd MMM', { locale })} - ${format(weekEnd, 'd MMM', { locale })}`
      })
    }
    
    return options
  }

  const weekOptions = generateWeekOptions()
  
  // Calculate how many weeks back the selected week is
  const getWeeksBack = (date: Date): number => {
    const today = new Date()
    for (let i = 0; i <= maxWeeksBack; i++) {
      const checkWeek = i === 0 ? today : subWeeks(today, i)
      if (isSameWeek(checkWeek, date, { weekStartsOn: 1 })) {
        return i
      }
    }
    return 0 // default to current week
  }

  const currentValue = getWeeksBack(selectedWeek)

  const handleWeekSelect = (value: string | number) => {
    const weeksBack = typeof value === 'number' ? value : parseInt(String(value))
    const today = new Date()
    const newWeek = weeksBack === 0 ? today : subWeeks(today, weeksBack)
    onWeekChange(newWeek)
  }

  return (
    <Dropdown
      options={weekOptions}
      value={currentValue}
      onChange={handleWeekSelect}
      icon={<Calendar className="w-4 h-4" />}
      aria-label={t('weekSelector.selectWeek')}
      buttonClassName="min-w-[200px]"
    />
  )
}
