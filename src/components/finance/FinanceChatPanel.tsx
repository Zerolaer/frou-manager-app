import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot, GripHorizontal, Maximize2, Minimize, Minimize2, Send, Sparkles, Trash2 } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import ModalHeader from '@/components/ui/ModalHeader'
import { ModalButton } from '@/components/ui/ModalSystem'
import { useFinanceAI } from '@/hooks/useFinanceAI'
import { cn } from '@/lib/utils'
import type { Cat } from '@/types/shared'
import { FinanceChatMarkdown } from '@/components/finance/FinanceChatMarkdown'

type Props = {
  open: boolean
  onClose: () => void
  year: number
  income: Cat[]
  expense: Cat[]
  fullScreen?: boolean
  allowWrites?: boolean
  activeMonthIndex?: number
  userId?: string | null
  onDataChanged?: () => void
}

const QUICK_PROMPTS = [
  'finance.ai.promptAnalyzeMonth',
  'finance.ai.promptBudget',
  'finance.ai.promptOverspend',
  'finance.ai.promptSavings',
] as const

const WRITE_PROMPTS = [
  'finance.ai.promptSpendAccount',
  'finance.ai.promptSpendAndRecord',
] as const

const PANEL_MIN_W = 340
const PANEL_MIN_H = 360
const PANEL_DEFAULT_W = 420
const PANEL_DEFAULT_H = 560
const PANEL_EXPANDED_W = 480
const BUBBLE_SIZE = 56
const VIEWPORT_MARGIN = 16
const DRAG_THRESHOLD = 4
const STORAGE_KEY = 'frovo.finance.ai.panel'

type PanelLayout = {
  x: number
  y: number
  w: number
  h: number
  expanded: boolean
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max)
}

function clampPosition(x: number, y: number, width: number, height: number) {
  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)
  const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN)
  return {
    x: clamp(x, VIEWPORT_MARGIN, maxX),
    y: clamp(y, VIEWPORT_MARGIN, maxY),
  }
}

function defaultLayout(): PanelLayout {
  const w = PANEL_DEFAULT_W
  const h = PANEL_DEFAULT_H
  const pos = clampPosition(
    window.innerWidth - w - VIEWPORT_MARGIN,
    window.innerHeight - h - VIEWPORT_MARGIN,
    w,
    h,
  )
  return { ...pos, w, h, expanded: false }
}

function readStoredLayout(): PanelLayout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PanelLayout>
    if (
      typeof parsed.x !== 'number' ||
      typeof parsed.y !== 'number' ||
      typeof parsed.w !== 'number' ||
      typeof parsed.h !== 'number'
    ) {
      return null
    }
    const w = clamp(parsed.w, PANEL_MIN_W, window.innerWidth - VIEWPORT_MARGIN * 2)
    const h = clamp(parsed.h, PANEL_MIN_H, window.innerHeight - VIEWPORT_MARGIN * 2)
    const pos = clampPosition(parsed.x, parsed.y, w, h)
    return { ...pos, w, h, expanded: !!parsed.expanded }
  } catch {
    return null
  }
}

function persistLayout(layout: PanelLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {
    /* ignore */
  }
}

function getBubblePosition(layout: PanelLayout) {
  return clampPosition(
    layout.x + layout.w - BUBBLE_SIZE,
    layout.y + layout.h - BUBBLE_SIZE,
    BUBBLE_SIZE,
    BUBBLE_SIZE,
  )
}

export default function FinanceChatPanel({
  open,
  onClose,
  year,
  income,
  expense,
  fullScreen = false,
  allowWrites = false,
  activeMonthIndex,
  userId,
  onDataChanged,
}: Props) {
  const { t } = useSafeTranslation()
  const { messages, loading, error, sendMessage, clearChat } = useFinanceAI(year, income, expense, {
    allowWrites,
    activeMonthIndex,
    userId,
    onDataChanged,
  })
  const [input, setInput] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [layout, setLayout] = useState<PanelLayout | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const bubbleRef = useRef<HTMLButtonElement>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const dragModeRef = useRef<'panel' | 'bubble' | 'resize'>('panel')
  const pointerStartRef = useRef({ x: 0, y: 0 })
  const resizeStartRef = useRef({ w: 0, h: 0, x: 0, y: 0 })
  const didDragRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const collapsedRef = useRef(collapsed)
  const prevMessageCountRef = useRef(0)
  const layoutRef = useRef(layout)

  const now = new Date()
  const calendarMonthNames = [
    t('finance.months.jan'), t('finance.months.feb'), t('finance.months.mar'),
    t('finance.months.apr'), t('finance.months.may'), t('finance.months.jun'),
    t('finance.months.jul'), t('finance.months.aug'), t('finance.months.sep'),
    t('finance.months.oct'), t('finance.months.nov'), t('finance.months.dec'),
  ]
  const currentMonthName = calendarMonthNames[now.getMonth()]
  const calendarYear = now.getFullYear()

  function resolveQuickPrompt(key: string): string {
    if (key === 'finance.ai.promptAnalyzeMonth') {
      return t(key, { monthName: currentMonthName, year: calendarYear })
    }
    return t(key)
  }

  const quickPrompts = allowWrites ? WRITE_PROMPTS : QUICK_PROMPTS

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    collapsedRef.current = collapsed
  }, [collapsed])

  useEffect(() => {
    layoutRef.current = layout
  }, [layout])

  useEffect(() => {
    if (open) {
      setIsVisible(true)
      setIsAnimating(true)
      setCollapsed(false)
      setHasUnread(false)
      setLayout(readStoredLayout() ?? defaultLayout())
      const timer = setTimeout(() => setIsAnimating(false), 10)
      return () => clearTimeout(timer)
    }

    setIsAnimating(true)
    const timer = setTimeout(() => {
      setIsVisible(false)
      setIsAnimating(false)
      setCollapsed(false)
      setHasUnread(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open || collapsed) return
    setTimeout(() => inputRef.current?.focus(), 150)
  }, [open, collapsed])

  useEffect(() => {
    const assistantCount = messages.filter((m) => m.role === 'assistant').length
    if (collapsedRef.current && assistantCount > prevMessageCountRef.current && !loading) {
      setHasUnread(true)
    }
    prevMessageCountRef.current = assistantCount
  }, [messages, loading])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const clampLayoutToViewport = useCallback(() => {
    setLayout((prev) => {
      if (!prev) return prev
      const maxW = window.innerWidth - VIEWPORT_MARGIN * 2
      const maxH = window.innerHeight - VIEWPORT_MARGIN * 2
      const w = clamp(prev.expanded ? Math.max(prev.w, PANEL_EXPANDED_W) : prev.w, PANEL_MIN_W, maxW)
      const h = clamp(prev.expanded ? maxH : prev.h, PANEL_MIN_H, maxH)
      const pos = clampPosition(prev.x, prev.y, w, h)
      const next = { ...prev, ...pos, w, h }
      persistLayout(next)
      return next
    })
  }, [])

  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', clampLayoutToViewport)
    return () => window.removeEventListener('resize', clampLayoutToViewport)
  }, [open, clampLayoutToViewport])

  useEffect(() => {
    if (!isDragging && !isResizing) return

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - pointerStartRef.current.x
      const dy = e.clientY - pointerStartRef.current.y
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        didDragRef.current = true
      }

      const current = layoutRef.current
      if (!current) return

      if (dragModeRef.current === 'resize') {
        const maxW = window.innerWidth - current.x - VIEWPORT_MARGIN
        const maxH = window.innerHeight - current.y - VIEWPORT_MARGIN
        const w = clamp(resizeStartRef.current.w + dx, PANEL_MIN_W, maxW)
        const h = clamp(resizeStartRef.current.h + dy, PANEL_MIN_H, maxH)
        setLayout({ ...current, w, h, expanded: false })
        return
      }

      if (dragModeRef.current === 'bubble') {
        const bubblePos = clampPosition(
          e.clientX - dragOffsetRef.current.x,
          e.clientY - dragOffsetRef.current.y,
          BUBBLE_SIZE,
          BUBBLE_SIZE,
        )
        const next = {
          ...current,
          x: bubblePos.x + BUBBLE_SIZE - current.w,
          y: bubblePos.y + BUBBLE_SIZE - current.h,
        }
        const clamped = clampPosition(next.x, next.y, current.w, current.h)
        setLayout({ ...current, ...clamped })
        return
      }

      const next = clampPosition(
        e.clientX - dragOffsetRef.current.x,
        e.clientY - dragOffsetRef.current.y,
        current.w,
        current.h,
      )
      setLayout({ ...current, ...next })
    }

    const onPointerUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      const current = layoutRef.current
      if (current) persistLayout(current)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [isDragging, isResizing])

  function handlePanelDragStart(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('button')) return
    if (!layout || !panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    dragModeRef.current = 'panel'
    didDragRef.current = false
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    setIsDragging(true)
    e.preventDefault()
  }

  function handleBubbleDragStart(e: React.PointerEvent) {
    if (!layout || !bubbleRef.current) return
    const rect = bubbleRef.current.getBoundingClientRect()
    dragModeRef.current = 'bubble'
    didDragRef.current = false
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    setIsDragging(true)
    e.preventDefault()
  }

  function handleResizeStart(e: React.PointerEvent) {
    if (!layout) return
    e.stopPropagation()
    e.preventDefault()
    dragModeRef.current = 'resize'
    didDragRef.current = false
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
    resizeStartRef.current = { w: layout.w, h: layout.h, x: layout.x, y: layout.y }
    setIsResizing(true)
  }

  function handleToggleExpanded() {
    setLayout((prev) => {
      if (!prev) return prev
      const expanded = !prev.expanded
      const maxH = window.innerHeight - VIEWPORT_MARGIN * 2
      const w = expanded ? Math.max(prev.w, PANEL_EXPANDED_W) : Math.min(prev.w, PANEL_DEFAULT_W)
      const h = expanded ? maxH : PANEL_DEFAULT_H
      const pos = clampPosition(prev.x, prev.y, w, h)
      const next = { ...prev, ...pos, w, h, expanded }
      persistLayout(next)
      return next
    })
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = '40px'
    await sendMessage(text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  function autoGrowTextarea(el: HTMLTextAreaElement) {
    el.style.height = '40px'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  if (!isVisible || !layout) return null

  const bubblePosition = getBubblePosition(layout)
  const suppressMotion = isDragging || isResizing

  const bubble = (
    <button
      ref={bubbleRef}
      type="button"
      aria-label={t('finance.ai.expand')}
      title={t('finance.ai.expand')}
      onClick={() => {
        if (didDragRef.current) {
          didDragRef.current = false
          return
        }
        setCollapsed(false)
        setHasUnread(false)
        setTimeout(() => inputRef.current?.focus(), 100)
      }}
      onPointerDown={handleBubbleDragStart}
      className={cn(
        'fixed z-[120] flex h-14 w-14 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-white shadow-2xl ring-1 ring-black/10',
        !suppressMotion && 'transition-opacity duration-200 ease-out',
        !isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-90',
        isDragging ? 'cursor-grabbing select-none' : 'cursor-grab',
      )}
      style={{ left: bubblePosition.x, top: bubblePosition.y }}
    >
      <Bot className="h-6 w-6" />
      {(hasUnread || loading) && (
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white',
            loading ? 'bg-neutral-300 animate-pulse' : 'bg-red-500',
          )}
          aria-hidden
        />
      )}
    </button>
  )

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t('finance.ai.title')}
      className={cn(
        'fixed z-[120] flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/10',
        !suppressMotion && 'transition-[opacity,transform] duration-200 ease-out',
        fullScreen ? 'finance-ai-mobile inset-0' : '',
        !isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        (isDragging || isResizing) && 'select-none',
      )}
      style={
        fullScreen
          ? { left: 0, top: 0 }
          : { left: layout.x, top: layout.y, width: layout.w, height: layout.h }
      }
    >
      <div
        className={cn(!fullScreen && 'cursor-grab active:cursor-grabbing', 'flex-shrink-0')}
        onPointerDown={fullScreen ? undefined : handlePanelDragStart}
        style={fullScreen ? { paddingTop: 'env(safe-area-inset-top, 0px)' } : undefined}
      >
        <ModalHeader
          title={
            <span className="inline-flex items-center gap-2">
              {!fullScreen && <GripHorizontal className="h-4 w-4 text-gray-400" aria-hidden />}
              {t('finance.ai.title')}
            </span>
          }
          onClose={onClose}
          rightContent={
            fullScreen ? undefined : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleToggleExpanded}
                  className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-gray-100"
                  aria-label={layout.expanded ? t('finance.ai.restoreSize') : t('finance.ai.expandHeight')}
                  title={layout.expanded ? t('finance.ai.restoreSize') : t('finance.ai.expandHeight')}
                >
                  {layout.expanded ? (
                    <Minimize className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Maximize2 className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-gray-100"
                  aria-label={t('finance.ai.minimize')}
                  title={t('finance.ai.minimize')}
                >
                  <Minimize2 className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            )
          }
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-5 py-3">
        {messages.length > 0 && (
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={clearChat}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <Trash2 className="h-3 w-3" />
              {t('finance.ai.clearChat')}
            </button>
          </div>
        )}

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-neutral-700" />
                  <p className="text-sm text-gray-600">
                    {t(allowWrites ? 'finance.ai.welcomeWrite' : 'finance.ai.welcome')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void sendMessage(resolveQuickPrompt(key))}
                    disabled={loading}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {resolveQuickPrompt(key)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[95%] rounded-2xl px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'rounded-br-md whitespace-pre-wrap bg-black text-white'
                    : 'rounded-bl-md bg-gray-100 text-gray-800',
                )}
              >
                {msg.role === 'assistant' ? (
                  <FinanceChatMarkdown content={msg.content} variant="assistant" />
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative flex-shrink-0 rounded-b-2xl border-t border-gray-200 bg-gray-50 px-5 py-3">
        <form onSubmit={handleSubmit} className="w-full">
          {error && (
            <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                autoGrowTextarea(e.target)
              }}
              onKeyDown={handleKeyDown}
              placeholder={t(allowWrites ? 'finance.ai.placeholderWrite' : 'finance.ai.placeholder')}
              rows={1}
              disabled={loading}
              className="max-h-[120px] min-h-[40px] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-neutral-800 disabled:opacity-60"
            />
            <ModalButton
              variant="primary"
              disabled={loading || !input.trim()}
              onClick={() => void handleSubmit()}
              className="flex h-10 w-10 shrink-0 items-center justify-center !bg-black !p-0 hover:!bg-gray-800"
            >
              <Send className="h-4 w-4" />
            </ModalButton>
          </div>
        </form>

        {!fullScreen && (
          <button
            type="button"
            aria-label="Resize"
            onPointerDown={handleResizeStart}
            className="absolute bottom-1 right-1 flex h-5 w-5 cursor-nwse-resize items-center justify-center text-gray-300 hover:text-gray-500"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <path d="M9 1L1 9M9 5L5 9M9 9H9" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )

  return createPortal(collapsed && !fullScreen ? bubble : panel, document.body)
}
