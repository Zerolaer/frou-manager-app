import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot, Maximize2, Minimize, Minimize2, Send, Sparkles, Trash2 } from 'lucide-react'
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
}

const QUICK_PROMPTS = [
  'finance.ai.promptAnalyzeMonth',
  'finance.ai.promptBudget',
  'finance.ai.promptOverspend',
  'finance.ai.promptSavings',
] as const

const PANEL_WIDTH = 420
const PANEL_HEIGHT = 560
const PANEL_EXPANDED_WIDTH = 480
const BUBBLE_SIZE = 56
const VIEWPORT_MARGIN = 16

function clampPosition(x: number, y: number, width: number, height: number) {
  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)
  const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN)
  return {
    x: Math.min(Math.max(VIEWPORT_MARGIN, x), maxX),
    y: Math.min(Math.max(VIEWPORT_MARGIN, y), maxY),
  }
}

function getDefaultPosition(width: number, height: number) {
  return clampPosition(
    window.innerWidth - width - VIEWPORT_MARGIN,
    window.innerHeight - height - VIEWPORT_MARGIN,
    width,
    height,
  )
}

function getBubblePosition(
  panelPos: { x: number; y: number },
  panelWidth: number,
  panelHeight: number,
) {
  return clampPosition(
    panelPos.x + panelWidth - BUBBLE_SIZE,
    panelPos.y + panelHeight - BUBBLE_SIZE,
    BUBBLE_SIZE,
    BUBBLE_SIZE,
  )
}

function getPanelPositionFromBubble(
  bubblePos: { x: number; y: number },
  panelWidth: number,
  panelHeight: number,
) {
  return clampPosition(
    bubblePos.x + BUBBLE_SIZE - panelWidth,
    bubblePos.y + BUBBLE_SIZE - panelHeight,
    panelWidth,
    panelHeight,
  )
}

export default function FinanceChatPanel({ open, onClose, year, income, expense }: Props) {
  const { t } = useSafeTranslation()
  const { messages, loading, error, sendMessage, clearChat } = useFinanceAI(year, income, expense)
  const [input, setInput] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const bubbleRef = useRef<HTMLButtonElement>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const dragModeRef = useRef<'panel' | 'bubble'>('panel')
  const didDragRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const collapsedRef = useRef(collapsed)
  const prevMessageCountRef = useRef(0)

  const now = new Date()
  const calendarMonthNames = [
    t('finance.months.jan'), t('finance.months.feb'), t('finance.months.mar'),
    t('finance.months.apr'), t('finance.months.may'), t('finance.months.jun'),
    t('finance.months.jul'), t('finance.months.aug'), t('finance.months.sep'),
    t('finance.months.oct'), t('finance.months.nov'), t('finance.months.dec'),
  ]
  const currentMonthName = calendarMonthNames[now.getMonth()]
  const calendarYear = now.getFullYear()

  function resolveQuickPrompt(key: (typeof QUICK_PROMPTS)[number]): string {
    if (key === 'finance.ai.promptAnalyzeMonth') {
      return t(key, { monthName: currentMonthName, year: calendarYear })
    }
    return t(key)
  }

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    collapsedRef.current = collapsed
  }, [collapsed])

  useEffect(() => {
    if (open) {
      setIsVisible(true)
      setIsAnimating(true)
      setCollapsed(false)
      setExpanded(false)
      setHasUnread(false)
      setPosition(getDefaultPosition(PANEL_WIDTH, PANEL_HEIGHT))
      const timer = setTimeout(() => setIsAnimating(false), 10)
      return () => clearTimeout(timer)
    }

    setIsAnimating(true)
    const timer = setTimeout(() => {
      setIsVisible(false)
      setIsAnimating(false)
      setCollapsed(false)
      setExpanded(false)
      setHasUnread(false)
      setPosition(null)
    }, 200)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open || collapsed) return
    setTimeout(() => inputRef.current?.focus(), 150)
  }, [open, collapsed])

  useEffect(() => {
    const assistantCount = messages.filter((m) => m.role === 'assistant').length
    if (
      collapsedRef.current &&
      assistantCount > prevMessageCountRef.current &&
      !loading
    ) {
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

  const getPanelDimensions = useCallback(() => {
    const rect = panelRef.current?.getBoundingClientRect()
    const fallbackWidth = expanded ? PANEL_EXPANDED_WIDTH : PANEL_WIDTH
    const fallbackHeight = expanded
      ? window.innerHeight - VIEWPORT_MARGIN * 2
      : PANEL_HEIGHT
    return {
      width: rect?.width ?? fallbackWidth,
      height: rect?.height ?? fallbackHeight,
    }
  }, [expanded])

  const clampToViewport = useCallback(() => {
    const { width, height } = getPanelDimensions()
    setPosition((prev) => (prev ? clampPosition(prev.x, prev.y, width, height) : prev))
  }, [getPanelDimensions])

  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', clampToViewport)
    return () => window.removeEventListener('resize', clampToViewport)
  }, [open, clampToViewport])

  useEffect(() => {
    if (!open || collapsed) return
    clampToViewport()
  }, [expanded, open, collapsed, clampToViewport])

  useEffect(() => {
    if (!isDragging) return

    const onMouseMove = (e: MouseEvent) => {
      didDragRef.current = true
      const { width, height } = getPanelDimensions()

      if (dragModeRef.current === 'bubble') {
        const bubblePos = clampPosition(
          e.clientX - dragOffsetRef.current.x,
          e.clientY - dragOffsetRef.current.y,
          BUBBLE_SIZE,
          BUBBLE_SIZE,
        )
        setPosition(getPanelPositionFromBubble(bubblePos, width, height))
        return
      }

      const next = clampPosition(
        e.clientX - dragOffsetRef.current.x,
        e.clientY - dragOffsetRef.current.y,
        width,
        height,
      )
      setPosition(next)
    }

    const onMouseUp = () => setIsDragging(false)

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isDragging, getPanelDimensions])

  function handlePanelDragStart(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return
    if (!position || !panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    dragModeRef.current = 'panel'
    didDragRef.current = false
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
    setIsDragging(true)
    e.preventDefault()
  }

  function handleBubbleDragStart(e: React.MouseEvent<HTMLButtonElement>) {
    if (!position || !bubbleRef.current) return
    const rect = bubbleRef.current.getBoundingClientRect()
    dragModeRef.current = 'bubble'
    didDragRef.current = false
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
    setIsDragging(true)
    e.preventDefault()
  }

  function handleExpand() {
    setCollapsed(false)
    setHasUnread(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function handleCollapse() {
    setCollapsed(true)
  }

  function handleToggleExpanded() {
    setExpanded((prev) => !prev)
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    await sendMessage(text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  if (!isVisible || !position) return null

  const panelDimensions = getPanelDimensions()
  const bubblePosition = getBubblePosition(position, panelDimensions.width, panelDimensions.height)

  const panelTitle = t('finance.ai.title')

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
        handleExpand()
      }}
      onMouseDown={handleBubbleDragStart}
      className={cn(
        'fixed z-[100] flex items-center justify-center rounded-full border border-violet-200 bg-violet-600 text-white shadow-2xl ring-1 ring-black/10 transition-all duration-200 ease-out hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2',
        'h-14 w-14',
        !isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-90',
        isDragging && 'cursor-grabbing select-none',
        !isDragging && 'cursor-grab',
      )}
      style={{ left: bubblePosition.x, top: bubblePosition.y }}
    >
      <Bot className="h-6 w-6" />
      {(hasUnread || loading) && (
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white',
            loading ? 'bg-violet-300 animate-pulse' : 'bg-red-500',
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
        'fixed z-[100] flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/10 transition-all duration-200 ease-out',
        expanded
          ? 'w-[min(480px,calc(100vw-32px))] h-[calc(100vh-32px)]'
          : 'w-[min(420px,calc(100vw-32px))] h-[min(560px,calc(100vh-32px))]',
        !isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        isDragging && 'select-none',
      )}
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="cursor-grab active:cursor-grabbing flex-shrink-0"
        onMouseDown={handlePanelDragStart}
      >
        <ModalHeader
          title={panelTitle}
          onClose={onClose}
          rightContent={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleExpanded}
                className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center transition-colors hover:bg-gray-100"
                style={{ borderRadius: '12px' }}
                aria-label={expanded ? t('finance.ai.restoreSize') : t('finance.ai.expandHeight')}
                title={expanded ? t('finance.ai.restoreSize') : t('finance.ai.expandHeight')}
              >
                {expanded ? (
                  <Minimize className="h-4 w-4 text-gray-500" />
                ) : (
                  <Maximize2 className="h-4 w-4 text-gray-500" />
                )}
              </button>
              <button
                type="button"
                onClick={handleCollapse}
                className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center transition-colors hover:bg-gray-100"
                style={{ borderRadius: '12px' }}
                aria-label={t('finance.ai.minimize')}
                title={t('finance.ai.minimize')}
              >
                <Minimize2 className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          }
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
        {messages.length === 0 && (
          <div className="mb-4 space-y-3">
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-600">{t('finance.ai.welcome')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => void sendMessage(resolveQuickPrompt(key))}
                  disabled={loading}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-violet-300 hover:bg-violet-50 transition-colors disabled:opacity-50"
                >
                  {resolveQuickPrompt(key)}
                </button>
              ))}
            </div>
          </div>
        )}

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
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[95%] rounded-2xl px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-black text-white rounded-br-md whitespace-pre-wrap'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md',
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

      <div className="flex-shrink-0 rounded-b-2xl border-t border-gray-200 bg-gray-50 px-6 py-4">
        <form onSubmit={handleSubmit} className="w-full">
          {error && (
            <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('finance.ai.placeholder')}
              rows={1}
              disabled={loading}
              className="h-10 min-h-[40px] max-h-24 flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60"
            />
            <ModalButton
              variant="primary"
              disabled={loading || !input.trim()}
              onClick={() => void handleSubmit()}
              className="flex h-10 w-10 shrink-0 items-center justify-center !p-0 !bg-black hover:!bg-gray-800"
            >
              <Send className="h-4 w-4" />
            </ModalButton>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(collapsed ? bubble : panel, document.body)
}
