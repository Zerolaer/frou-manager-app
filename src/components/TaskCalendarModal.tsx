import React, { useState, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns'
import { UnifiedModal, ModalFooter, ModalButton } from '@/components/ui/ModalSystem'
import type { TaskItem } from '@/types/shared'

interface TaskCalendarModalProps {
  open: boolean
  onClose: () => void
  tasks: Record<string, TaskItem[]>
  onDateSelect: (date: Date) => void
  onMonthChange?: (month: Date) => void
}

export default function TaskCalendarModal({
  open,
  onClose,
  tasks,
  onDateSelect,
  onMonthChange
}: TaskCalendarModalProps) {
  const { t } = useTranslation()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Reset to current month when modal opens
  React.useEffect(() => {
    if (open) {
      setCurrentMonth(new Date())
    }
  }, [open])
  
  // Notify parent when month changes
  React.useEffect(() => {
    if (open && onMonthChange) {
      onMonthChange(currentMonth)
    }
  }, [currentMonth, open, onMonthChange])

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Group tasks by date and status
  const taskStatusByDate = useMemo(() => {
    const statusByDate: Record<string, { total: number, open: number, closed: number }> = {}
    Object.entries(tasks).forEach(([dateKey, taskList]) => {
      const openTasks = taskList.filter(task => task.status === 'open').length
      const closedTasks = taskList.filter(task => task.status === 'closed').length
      statusByDate[dateKey] = {
        total: taskList.length,
        open: openTasks,
        closed: closedTasks
      }
    })
    return statusByDate
  }, [tasks])

  const handleDateClick = (date: Date) => {
    onDateSelect(date)
    onClose()
  }

  // Get day names
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  // Calculate offset for first day (Monday = 0)
  const firstDayOffset = monthDays.length > 0 ? (monthDays[0].getDay() + 6) % 7 : 0

  return (
    <UnifiedModal
      open={open}
      onClose={onClose}
      title={t('actions.calendar')}
      size="xl"
      variant="center"
      footer={
        <ModalFooter
          right={
            <ModalButton variant="secondary" onClick={onClose}>
              {t('common.close')}
            </ModalButton>
          }
        />
      }
      bodyClassName="p-0"
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
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
      <div className="p-6">
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
              const taskStatus = taskStatusByDate[dateKey] || { total: 0, open: 0, closed: 0 }
              const isCurrentDay = isToday(day)
              const hasTasks = taskStatus.total > 0
              const hasOpenTasks = taskStatus.open > 0
              const allTasksClosed = hasTasks && taskStatus.open === 0

              return (
                <button
                  key={dateKey}
                  onClick={() => handleDateClick(day)}
                  className={`
                    relative aspect-square p-2 rounded-lg border transition-all
                    ${isCurrentDay 
                      ? 'border-black font-semibold' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }
                  `}
                  style={isCurrentDay ? { backgroundColor: '#F2F7FA' } : {}}
                >
                  <div className="text-sm text-gray-900">
                    {day.getDate()}
                  </div>
                  
                  {hasTasks && (
                    <div className={`absolute bottom-1 right-1 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-medium ${
                      hasOpenTasks 
                        ? 'bg-black' 
                        : allTasksClosed 
                          ? 'bg-gray-400' 
                          : 'bg-blue-600'
                    }`}>
                      {taskStatus.total > 99 ? '99+' : taskStatus.total}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
    </UnifiedModal>
  )
}

