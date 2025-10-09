import React from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { format, addDays, subDays, isToday, isSameDay } from 'date-fns'
import { useTranslation } from 'react-i18next'

interface MobileDayNavigatorProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  showTodayButton?: boolean
  className?: string
}

export default function MobileDayNavigator({
  currentDate,
  onDateChange,
  showTodayButton = true,
  className = ''
}: MobileDayNavigatorProps) {
  const { t } = useTranslation()
  const handlePreviousDay = () => {
    onDateChange(subDays(currentDate, 1))
  }

  const handleNextDay = () => {
    onDateChange(addDays(currentDate, 1))
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  const isCurrentDay = isToday(currentDate)

  return (
    <div className={`flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 ${className}`}>
      {/* Previous day button */}
      <button
        onClick={handlePreviousDay}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        aria-label={t('aria.previousDay')}
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>

      {/* Current date display */}
      <div className="flex flex-col items-center">
        <div className="text-sm font-medium text-gray-900">
          {format(currentDate, 'EEEE, d MMMM')}
        </div>
        <div className="text-xs text-gray-500">
          {format(currentDate, 'yyyy')}
        </div>
      </div>

      {/* Next day button */}
      <button
        onClick={handleNextDay}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        aria-label={t('aria.nextDay')}
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>

      {/* Today button */}
      {showTodayButton && !isCurrentDay && (
        <button
          onClick={handleToday}
          className="ml-2 flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
          aria-label={t('common.today')}
        >
          <Calendar className="w-3 h-3" />
          {t('common.today')}
        </button>
      )}
    </div>
  )
}

