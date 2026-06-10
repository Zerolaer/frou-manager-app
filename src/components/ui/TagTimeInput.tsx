import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { isValidScheduledTime, parseScheduledTime } from '@/lib/scheduledTime'
import WheelTimePicker, { wheelTimeToString } from './WheelTimePicker'

type TagTimeInputProps = {
  tag: string
  onTagChange: (tag: string) => void
  scheduledTime: string | null
  onScheduledTimeChange: (time: string | null) => void
  placeholder?: string
  className?: string
}

export default function TagTimeInput({
  tag,
  onTagChange,
  scheduledTime,
  onScheduledTimeChange,
  placeholder,
  className = '',
}: TagTimeInputProps) {
  const { t } = useSafeTranslation()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const [pickerSeed, setPickerSeed] = useState(0)

  const parsed = parseScheduledTime(scheduledTime)
  const draftRef = useRef({ hours: parsed.hours, minutes: parsed.minutes })

  useEffect(() => {
    if (open) {
      const next = parseScheduledTime(scheduledTime)
      draftRef.current = { hours: next.hours, minutes: next.minutes }
      setPickerSeed((s) => s + 1)
    }
  }, [open, scheduledTime])

  useEffect(() => {
    if (!open || !wrapperRef.current) return

    const updatePosition = () => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      const popoverHeight = 220
      const spaceBelow = window.innerHeight - rect.bottom
      const openAbove = spaceBelow < popoverHeight && rect.top > popoverHeight
      setPosition({
        top: openAbove ? rect.top - popoverHeight - 8 : rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 220),
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)

    const onScroll = (e: Event) => {
      const popover = popoverRef.current
      if (popover && e.target instanceof Node && popover.contains(e.target)) return
      updatePosition()
    }
    window.addEventListener('scroll', onScroll, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const hasTime = isValidScheduledTime(scheduledTime)

  const applyTime = () => {
    const { hours, minutes } = draftRef.current
    onScheduledTimeChange(wheelTimeToString(hours, minutes))
    setOpen(false)
  }

  const clearTime = () => {
    onScheduledTimeChange(null)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div
        className="relative w-full h-10 rounded-xl bg-white border transition-all duration-200 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-gray-500 focus-within:ring-offset-2"
        style={{ borderColor: '#E5E7EB' }}
      >
        <input
          type="text"
          value={tag}
          onChange={(e) => onTagChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-full pl-4 pr-24 py-2.5 bg-transparent text-gray-700 outline-none rounded-xl"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`absolute right-1.5 top-1.5 bottom-1.5 flex items-center gap-1 px-2 rounded-lg border transition-colors shrink-0 ${
            hasTime
              ? 'text-gray-900 bg-gray-100 border-gray-200 hover:bg-gray-200'
              : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50'
          }`}
          aria-label={t('tasks.setScheduledTime')}
          aria-expanded={open}
        >
          {hasTime && (
            <span className="text-xs font-semibold tabular-nums text-gray-700">{scheduledTime}</span>
          )}
          <Clock className="w-4 h-4 shrink-0" />
        </button>
      </div>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            ref={popoverRef}
            className="fixed z-[9999] bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              touchAction: 'manipulation',
            }}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <WheelTimePicker
              key={pickerSeed}
              hours={draftRef.current.hours}
              minutes={draftRef.current.minutes}
              onChange={(h, m) => {
                draftRef.current = { hours: h, minutes: m }
              }}
              hourLabel={t('tasks.hours')}
              minuteLabel={t('tasks.minutes')}
            />
            <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100">
              {hasTime && (
                <button
                  type="button"
                  onClick={clearTime}
                  className="flex-1 h-9 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {t('common.clear')}
                </button>
              )}
              <button
                type="button"
                onClick={applyTime}
                className="flex-1 h-9 rounded-xl text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors"
              >
                {t('common.apply')}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
