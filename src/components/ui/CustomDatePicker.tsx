import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'

interface CustomDatePickerProps {
  value: string // ISO format: yyyy-MM-dd
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  buttonClassName?: string
  minDate?: string // ISO format: yyyy-MM-dd - minimum selectable date
  iconOnly?: boolean // Show only calendar icon, no text
}

export default function CustomDatePicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  buttonClassName = '',
  minDate,
  iconOnly = false
}: CustomDatePickerProps) {
  const { t } = useSafeTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const containerRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0, right: 0, bottom: 0 })

  // Инициализируем currentMonth из value если есть
  useEffect(() => {
    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        setCurrentMonth(date)
      }
    }
  }, [value])

  // Вычисляем позицию календаря при открытии с учетом границ экрана
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const calendarWidth = 280 // ширина календаря
      const calendarHeight = 350 // примерная высота календаря
      const padding = 8 // отступ от кнопки
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const scrollY = window.scrollY
      const scrollX = window.scrollX
      
      // Вычисляем позицию снизу (по умолчанию)
      let top = rect.bottom + scrollY + padding
      let left = rect.left + scrollX
      
      // Проверяем, не выходит ли календарь за нижнюю границу экрана
      if (rect.bottom + calendarHeight + padding > viewportHeight) {
        // Если выходит снизу, показываем сверху
        top = rect.top + scrollY - calendarHeight - padding
        // Если и сверху не помещается, прижимаем к верхней границе и ограничиваем высоту
        if (top < scrollY) {
          top = scrollY + padding
        }
      }
      
      // Проверяем, не выходит ли календарь за правую границу экрана
      if (rect.right + calendarWidth > viewportWidth) {
        // Если выходит справа, выравниваем по правому краю кнопки
        left = rect.right + scrollX - calendarWidth
        // Если и слева не помещается, прижимаем к левой границе
        if (left < scrollX + padding) {
          left = scrollX + padding
        }
      }
      
      // Проверяем, не выходит ли календарь за левую границу экрана
      if (left < scrollX + padding) {
        left = scrollX + padding
      }
      
      // Вычисляем доступную высоту
      const availableHeight = viewportHeight - (top - scrollY) - padding
      const maxHeight = Math.min(calendarHeight, availableHeight)
      
      setCalendarPosition({
        top,
        left,
        right: 0, // не используется, используем left
        bottom: maxHeight
      })
    }
  }, [isOpen])

  // Закрываем календарь при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        calendarRef.current &&
        !calendarRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      // Use timeout to avoid immediate closing when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true)
      }, 0)
      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside, true)
      }
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

  const isDateDisabled = (day: number) => {
    if (!minDate) return false
    const dateToCheck = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const minDateObj = new Date(minDate)
    // Compare dates without time
    const dateStr = `${dateToCheck.getFullYear()}-${String(dateToCheck.getMonth() + 1).padStart(2, '0')}-${String(dateToCheck.getDate()).padStart(2, '0')}`
    const minDateStr = `${minDateObj.getFullYear()}-${String(minDateObj.getMonth() + 1).padStart(2, '0')}-${String(minDateObj.getDate()).padStart(2, '0')}`
    return dateStr < minDateStr
  }

  const handleDateSelect = (day: number) => {
    if (isDateDisabled(day)) return
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    // Use local date formatting to avoid timezone issues
    const year = selectedDate.getFullYear()
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(selectedDate.getDate()).padStart(2, '0')
    const isoDate = `${year}-${month}-${dayStr}`
    console.log('🗓️ CustomDatePicker handleDateSelect:', { day, selectedDate, isoDate, currentValue: value })
    onChange(isoDate)
    setIsOpen(false)
  }

  const handleToday = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const isoDate = `${year}-${month}-${day}`
    onChange(isoDate)
    setCurrentMonth(today)
  }

  const handleTomorrow = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const year = tomorrow.getFullYear()
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const day = String(tomorrow.getDate()).padStart(2, '0')
    const isoDate = `${year}-${month}-${day}`
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
    <div className={`relative ${iconOnly ? 'w-auto h-auto' : 'w-full'} ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled) setIsOpen(!isOpen)
        }}
        disabled={disabled}
        className={`
          ${iconOnly 
            ? 'w-auto h-auto rounded-xl flex items-center justify-center' 
            : 'w-full h-10 rounded-xl px-4 flex items-center justify-between'
          }
          text-sm border bg-white outline-none hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}
        `}
        style={iconOnly && buttonClassName?.includes('!border-0') ? { border: 'none', backgroundColor: 'transparent' } : { borderColor: '#E5E7EB' }}
      >
        {!iconOnly && (
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {formatDisplayDate(value)}
          </span>
        )}
        <Calendar className={`${iconOnly ? 'w-4 h-4' : 'w-4 h-4'} text-gray-400 hover:text-gray-600`} />
      </button>

      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
          <div 
            ref={calendarRef}
            className="fixed z-[9999] bg-white rounded-2xl shadow-xl border border-gray-200 p-3" 
            style={{ 
              top: `${calendarPosition.top}px`,
              left: `${calendarPosition.left}px`,
              width: '280px',
              maxHeight: `${calendarPosition.bottom}px`,
              overflowY: calendarPosition.bottom < 350 ? 'auto' : 'visible'
            }}
          >
          {/* Header with month/year navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="text-sm font-semibold text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
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
          <div className="grid grid-cols-7 gap-1 mb-3">
            {/* Empty cells before first day */}
            {Array.from({ length: adjustedStartDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const selected = isSelected(day)
              const today = isToday(day)
              const disabled = isDateDisabled(day)

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  disabled={disabled}
                  className={`
                    aspect-square flex items-center justify-center text-sm rounded-xl transition-all
                    ${disabled
                      ? 'text-gray-300 cursor-not-allowed opacity-50'
                      : selected 
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

          {/* Remove date button - показываем только если есть выбранная дата */}
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
                setIsOpen(false)
              }}
              className="w-full py-2 px-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
            >
              Убрать дату
            </button>
          )}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

