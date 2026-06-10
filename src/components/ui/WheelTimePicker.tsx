import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { formatScheduledTime } from '@/lib/scheduledTime'

const ITEM_HEIGHT = 32
const VISIBLE_ROWS = 5
const WHEEL_HEIGHT = VISIBLE_ROWS * ITEM_HEIGHT
const PADDING_ROWS = Math.floor(VISIBLE_ROWS / 2)
const SNAP_ANIM_MS = 280

const supportsScrollEnd =
  typeof window !== 'undefined' && 'onscrollend' in document.createElement('div')

function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(length - 1, index))
}

function indexFromScrollTop(scrollTop: number) {
  return Math.round(scrollTop / ITEM_HEIGHT)
}

type WheelColumnProps = {
  values: number[]
  defaultValue: number
  onCommit: (value: number) => void
  formatValue?: (value: number) => string
  ariaLabel: string
}

function WheelColumn({ values, defaultValue, onCommit, formatValue, ariaLabel }: WheelColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isSnapping = useRef(false)
  const isMouseDragging = useRef(false)
  const pendingDragSnap = useRef(false)
  const dragStartY = useRef(0)
  const dragStartScrollTop = useRef(0)
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewRaf = useRef<number | null>(null)
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit
  const [mouseDragging, setMouseDragging] = useState(false)

  const defaultIndex = Math.max(0, values.indexOf(defaultValue))
  const [previewIndex, setPreviewIndex] = useState(defaultIndex)

  const clearSnapTimer = useCallback(() => {
    if (snapTimer.current) {
      clearTimeout(snapTimer.current)
      snapTimer.current = null
    }
  }, [])

  const clearScrollStopTimer = useCallback(() => {
    if (scrollStopTimer.current) {
      clearTimeout(scrollStopTimer.current)
      scrollStopTimer.current = null
    }
  }, [])

  const commitIndex = useCallback(
    (index: number) => {
      const clamped = clampIndex(index, values.length)
      setPreviewIndex(clamped)
      onCommitRef.current(values[clamped])
    },
    [values],
  )

  const snapToNearest = useCallback(
    (smooth: boolean) => {
      const el = scrollRef.current
      if (!el || isSnapping.current) return

      const index = clampIndex(indexFromScrollTop(el.scrollTop), values.length)
      const targetTop = index * ITEM_HEIGHT
      const delta = Math.abs(el.scrollTop - targetTop)

      if (delta < 0.5) {
        pendingDragSnap.current = false
        commitIndex(index)
        return
      }

      isSnapping.current = true
      clearSnapTimer()
      el.scrollTo({ top: targetTop, behavior: smooth ? 'smooth' : 'auto' })

      if (!smooth) {
        isSnapping.current = false
        pendingDragSnap.current = false
        commitIndex(index)
      } else if (!supportsScrollEnd) {
        snapTimer.current = setTimeout(() => {
          isSnapping.current = false
          pendingDragSnap.current = false
          commitIndex(index)
        }, SNAP_ANIM_MS)
      }
    },
    [clearSnapTimer, commitIndex, values.length],
  )

  const updatePreviewFromScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    if (previewRaf.current !== null) return
    previewRaf.current = requestAnimationFrame(() => {
      previewRaf.current = null
      const elNow = scrollRef.current
      if (!elNow) return
      const next = clampIndex(indexFromScrollTop(elNow.scrollTop), values.length)
      setPreviewIndex((prev) => (prev === next ? prev : next))
    })
  }, [values.length])

  const scheduleSnapAfterScroll = useCallback(() => {
    if (supportsScrollEnd) return
    clearScrollStopTimer()
    scrollStopTimer.current = setTimeout(() => {
      scrollStopTimer.current = null
      if (!isSnapping.current) {
        snapToNearest(true)
      }
    }, 100)
  }, [clearScrollStopTimer, snapToNearest])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const index = clampIndex(defaultIndex, values.length)
    el.scrollTop = index * ITEM_HEIGHT
    setPreviewIndex(index)
  }, [defaultIndex, values.length])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !supportsScrollEnd) return

    const onScrollEnd = () => {
      if (pendingDragSnap.current) {
        pendingDragSnap.current = false
        if (isSnapping.current) {
          isSnapping.current = false
          const index = clampIndex(indexFromScrollTop(el.scrollTop), values.length)
          commitIndex(index)
        }
        return
      }
      if (isSnapping.current) {
        isSnapping.current = false
        const index = clampIndex(indexFromScrollTop(el.scrollTop), values.length)
        commitIndex(index)
        return
      }
      if (isMouseDragging.current) return
      snapToNearest(true)
    }

    el.addEventListener('scrollend', onScrollEnd)
    return () => {
      el.removeEventListener('scrollend', onScrollEnd)
      clearScrollStopTimer()
      clearSnapTimer()
      if (previewRaf.current !== null) {
        cancelAnimationFrame(previewRaf.current)
      }
    }
  }, [snapToNearest, commitIndex, clearScrollStopTimer, clearSnapTimer, values.length])

  const handleScroll = () => {
    if (isSnapping.current) return
    updatePreviewFromScroll()
    if (isMouseDragging.current) return
    scheduleSnapAfterScroll()
  }

  const endMouseDrag = useCallback(
    (pointerId: number) => {
      if (!isMouseDragging.current) return

      const el = scrollRef.current
      isMouseDragging.current = false
      setMouseDragging(false)

      if (el?.hasPointerCapture(pointerId)) {
        el.releasePointerCapture(pointerId)
      }

      clearScrollStopTimer()
      pendingDragSnap.current = true
      snapToNearest(true)
    },
    [clearScrollStopTimer, snapToNearest],
  )

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return
    if (e.button !== 0) return

    const el = scrollRef.current
    if (!el) return

    e.preventDefault()
    isMouseDragging.current = true
    setMouseDragging(true)
    pendingDragSnap.current = false
    dragStartY.current = e.clientY
    dragStartScrollTop.current = el.scrollTop
    clearScrollStopTimer()
    clearSnapTimer()
    isSnapping.current = false
    el.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return
    if (!isMouseDragging.current) return

    e.preventDefault()
    const el = scrollRef.current
    if (!el) return

    const maxScroll = Math.max(0, (values.length - 1) * ITEM_HEIGHT)
    const nextTop = dragStartScrollTop.current + (dragStartY.current - e.clientY)
    el.scrollTop = Math.max(0, Math.min(maxScroll, nextTop))
    updatePreviewFromScroll()
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return
    endMouseDrag(e.pointerId)
  }

  const stopTouchPropagation = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation()
  }

  return (
    <div className="relative flex-1 min-w-0" aria-label={ariaLabel}>
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 rounded-lg border border-gray-200 bg-gray-100/60"
        style={{ height: ITEM_HEIGHT }}
        aria-hidden
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={stopTouchPropagation}
        onTouchMove={stopTouchPropagation}
        className={`relative z-10 overflow-y-auto overscroll-contain scrollbar-hide select-none ${
          mouseDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          height: WHEEL_HEIGHT,
          scrollSnapType: mouseDragging ? 'none' : 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}
      >
        <div style={{ height: PADDING_ROWS * ITEM_HEIGHT }} aria-hidden />
        {values.map((item, index) => (
          <div
            key={item}
            className={`flex items-center justify-center text-sm tabular-nums transition-colors ${
              index === previewIndex
                ? 'font-semibold text-gray-900'
                : 'font-medium text-gray-400'
            }`}
            style={{
              height: ITEM_HEIGHT,
              scrollSnapAlign: 'center',
            }}
          >
            {formatValue ? formatValue(item) : String(item).padStart(2, '0')}
          </div>
        ))}
        <div style={{ height: PADDING_ROWS * ITEM_HEIGHT }} aria-hidden />
      </div>
    </div>
  )
}

type WheelTimePickerProps = {
  hours: number
  minutes: number
  onChange?: (hours: number, minutes: number) => void
  hourLabel: string
  minuteLabel: string
}

export default function WheelTimePicker({
  hours,
  minutes,
  onChange,
  hourLabel,
  minuteLabel,
}: WheelTimePickerProps) {
  const hourValues = Array.from({ length: 24 }, (_, i) => i)
  const minuteValues = Array.from({ length: 60 }, (_, i) => i)

  const draftRef = useRef({ hours, minutes })
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const commitDraft = useCallback((patch: Partial<{ hours: number; minutes: number }>) => {
    draftRef.current = { ...draftRef.current, ...patch }
    onChangeRef.current?.(draftRef.current.hours, draftRef.current.minutes)
  }, [])

  return (
    <div className="flex items-stretch gap-0.5 px-1.5 pb-1">
      <WheelColumn
        values={hourValues}
        defaultValue={hours}
        onCommit={(h) => commitDraft({ hours: h })}
        formatValue={(v) => String(v).padStart(2, '0')}
        ariaLabel={hourLabel}
      />
      <div className="flex items-center text-base font-semibold text-gray-400 pb-0.5">:</div>
      <WheelColumn
        values={minuteValues}
        defaultValue={minutes}
        onCommit={(m) => commitDraft({ minutes: m })}
        formatValue={(v) => String(v).padStart(2, '0')}
        ariaLabel={minuteLabel}
      />
    </div>
  )
}

export function wheelTimeToString(hours: number, minutes: number): string {
  return formatScheduledTime(hours, minutes)
}
