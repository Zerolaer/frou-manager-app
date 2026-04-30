import React, { useState, useMemo, useEffect, useRef } from 'react'
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
  const onMonthChangeRef = useRef(onMonthChange)
  onMonthChangeRef.current = onMonthChange

  // Sync month once when modal opens (ref avoids effect re-running when parent passes new callback identity)
  useEffect(() => {
    if (!open) return
    const m = new Date()
    setCurrentMonth(m)
    onMonthChangeRef.current?.(m)
  }, [open])

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
      size="md"
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
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50">
        <button
          type="button"
          onClick={() => {
            setCurrentMonth(prev => {
              const next = subMonths(prev, 1)
              onMonthChange?.(next)
              return next
            })
          }}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <h3 className="text-base font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        
        <button
          type="button"
          onClick={() => {
            setCurrentMonth(prev => {
              const next = addMonths(prev, 1)
              onMonthChange?.(next)
              return next
            })
          }}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="p-4">
          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {dayNames.map(day => (
              <div key={day} className="text-center text-[10px] font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
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
                    relative aspect-square p-1 rounded-md border transition-all
                    ${isCurrentDay 
                      ? 'border-black font-semibold' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }
                  `}
                  style={isCurrentDay ? { backgroundColor: '#F8F8F8' } : {}}
                >
                  <div className="text-xs text-gray-900">
                    {day.getDate()}
                  </div>
                  
                  {hasTasks && (
                    <div className={`absolute bottom-0.5 right-0.5 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-medium ${
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

