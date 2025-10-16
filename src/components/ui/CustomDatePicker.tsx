import React, { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'

interface CustomDatePickerProps {
  value: string // ISO format: yyyy-MM-dd
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  buttonClassName?: string
}

export default function CustomDatePicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  buttonClassName = ''
}: CustomDatePickerProps) {
  const { t } = useSafeTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Инициализируем currentMonth из value если есть
  useEffect(() => {
    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        setCurrentMonth(date)
      }
    }
  }, [value])

  // Закрываем календарь при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Закрываем календарь при нажатии Esc
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.stopImmediatePropagation()
        setIsOpen(false)
      }
    }

    if (isOpen) {
      // Add listener with higher priority (capture phase)
      window.addEventListener('keydown', handleEscape, { capture: true })
      return () => window.removeEventListener('keydown', handleEscape, { capture: true })
    }
  }, [isOpen])

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return placeholder || t('tasks.selectDate') || 'Выбрать дату'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return placeholder || t('tasks.selectDate') || 'Выбрать дату'
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    return { daysInMonth, startingDayOfWeek }
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const isoDate = selectedDate.toISOString().split('T')[0]
    onChange(isoDate)
    setIsOpen(false)
  }

  const handleToday = () => {
    const today = new Date()
    const isoDate = today.toISOString().split('T')[0]
    onChange(isoDate)
    setCurrentMonth(today)
  }

  const handleTomorrow = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const isoDate = tomorrow.toISOString().split('T')[0]
    onChange(isoDate)
    setCurrentMonth(tomorrow)
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth)
  
  // Проверяем, является ли день сегодняшним
  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    )
  }

  // Проверяем, является ли день выбранным
  const isSelected = (day: number) => {
    if (!value) return false
    const selectedDate = new Date(value)
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    )
  }

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ]

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  // Adjust starting day (0 = Sunday -> 6 = Saturday in our Mon-Sun week)
  const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full h-10 rounded-xl px-4 text-sm border bg-white outline-none hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between ${buttonClassName}`}
        style={{ borderColor: '#E5E7EB' }}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {formatDisplayDate(value)}
        </span>
        <Calendar className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-[280px] bg-white rounded-2xl shadow-xl border border-gray-200 p-3" style={{ right: 0 }}>
          {/* Header with month/year navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="text-sm font-semibold text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>


          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: adjustedStartDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const selected = isSelected(day)
              const today = isToday(day)

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={`
                    aspect-square flex items-center justify-center text-sm rounded-lg transition-all
                    ${selected 
                      ? 'bg-black text-white font-semibold' 
                      : today 
                        ? 'bg-gray-100 text-gray-900 font-medium border-2 border-gray-300' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

