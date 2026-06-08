import React, { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useNativeKeyboardInset } from '@/hooks/useNativeKeyboardInset'

type MobileModalProps = {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  /** Muted line below title — used with headerVariant="stacked" */
  subtitle?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  /** Если true — клик по оверлею закрывает модалку (по умолчанию true) */
  closeOnOverlay?: boolean
  /** Класс для тела модалки */
  bodyClassName?: string
  /** stacked: title row + subtitle (cell editor); default: single-line title */
  headerVariant?: 'default' | 'stacked'
}

function useFocusTrap(enabled: boolean, containerRef: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',')
    const nodes = Array.from(container.querySelectorAll<HTMLElement>(selectors))
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (nodes.length === 0) return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    container.addEventListener('keydown', onKey)
    first?.focus()
    return () => container.removeEventListener('keydown', onKey)
  }, [enabled, containerRef])
}

const CLOSE_BUTTON_CLASS =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100'

/** Shared horizontal inset for stacked header + cell editor body */
export const MOBILE_MODAL_STACKED_PX = 'px-4'

const STACKED_HEADER_TOP_STYLE = {
  paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
} as const

const MobileModal = ({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
  closeOnOverlay = true,
  bodyClassName = '',
  headerVariant = 'default',
}: MobileModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const keyboardInset = useNativeKeyboardInset(open)
  
  useFocusTrap(open, panelRef)

  useEffect(() => {
    if (open) {
      setIsVisible(true)
      setIsAnimating(true)
      // Небольшая задержка для начала анимации
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 10)
      return () => clearTimeout(timer)
    } else {
      setIsAnimating(true)
      // Задержка для анимации исчезновения
      const timer = setTimeout(() => {
        setIsVisible(false)
        setIsAnimating(false)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') {
        onClose() 
      }
    }
    // Use bubble phase (default) - will be called after capture phase listeners
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      // Вычисляем ширину скроллбара
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      
      // Скрываем скроллбар и компенсируем сдвиг контента
      document.body.style.overflow = 'hidden'
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
      }
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [open])

  if (!isVisible) return null

  const content = (
    <div
      className="fixed inset-0 z-[100] opacity-100"
      onMouseDown={() => { if (closeOnOverlay) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div className="absolute inset-0 flex flex-col">
        <div
          ref={panelRef}
          className={`h-full w-full bg-white flex flex-col transition-all duration-300 ease-out ${
            !isAnimating 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-full'
          }`}
          tabIndex={-1}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${keyboardInset}px)`,
          }}
        >
          {/* Header */}
          {title && (
            <div
              className={
                headerVariant === 'stacked'
                  ? `${MOBILE_MODAL_STACKED_PX} flex items-center gap-3 border-b border-gray-200 bg-white pb-3`
                  : 'flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3'
              }
              style={
                headerVariant === 'stacked'
                  ? STACKED_HEADER_TOP_STYLE
                  : { paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }
              }
            >
              {headerVariant === 'stacked' ? (
                <>
                  <div className="min-w-0 flex-1 flex flex-col gap-0">
                    <h2
                      className="m-0 truncate text-lg font-semibold leading-none text-gray-900"
                      id="modal-title"
                    >
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="m-0 truncate text-sm leading-none text-gray-500">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className={CLOSE_BUTTON_CLASS}
                    aria-label="Закрыть"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <h2
                    className="min-w-0 flex-1 truncate text-base font-semibold leading-snug text-gray-900"
                    id="modal-title"
                  >
                    {title}
                  </h2>
                  <button
                    onClick={onClose}
                    className={CLOSE_BUTTON_CLASS}
                    aria-label="Закрыть"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Body */}
          <div
            className={`flex-1 overflow-y-auto ${footer ? 'pb-4' : ''} ${
              headerVariant === 'stacked' && title ? 'pt-4' : ''
            } ${bodyClassName}`}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="mt-1 border-t border-gray-200 bg-white">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

export default MobileModal
