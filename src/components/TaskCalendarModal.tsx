import React, { useState, useMemo } from 'react'
import { X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import type { TaskItem } from '@/types/shared'

interface TaskCalendarModalProps {
  open: boolean
  onClose: () => void
  tasks: Record<string, TaskItem[]>
  onDateSelect: (date: Date) => void
}

export default function TaskCalendarModal({
  open,
  onClose,
  tasks,
  onDateSelect
}: TaskCalendarModalProps) {
  const { t } = useTranslation()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Group tasks by date
  const taskCountByDate = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.entries(tasks).forEach(([dateKey, taskList]) => {
      counts[dateKey] = taskList.length
    })
    return counts
  }, [tasks])

  const handleDateClick = (date: Date) => {
    onDateSelect(date)
    onClose()
  }

  if (!open) return null

  // Get day names
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  // Calculate offset for first day (Monday = 0)
  const firstDayOffset = (monthDays[0].getDay() + 6) % 7

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              {t('tasks.calendar')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <button
            onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <h3 className="text-lg font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          
          <button
            onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Day names */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Month days */}
            {monthDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const taskCount = taskCountByDate[dateKey] || 0
              const isCurrentDay = isToday(day)

              return (
                <button
                  key={dateKey}
                  onClick={() => handleDateClick(day)}
                  className={`
                    relative aspect-square p-2 rounded-lg border transition-all
                    ${isCurrentDay 
                      ? 'bg-blue-50 border-blue-500 font-semibold' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }
                    ${taskCount > 0 ? 'bg-green-50' : ''}
                  `}
                >
                  <div className="text-sm text-gray-900">
                    {day.getDate()}
                  </div>
                  
                  {taskCount > 0 && (
                    <div className="absolute bottom-1 right-1 bg-blue-600 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-medium">
                      {taskCount > 99 ? '99+' : taskCount}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-medium"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

