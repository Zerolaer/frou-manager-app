import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  /** Если true — клик по оверлею закрывает модалку (по умолчанию true) */
  closeOnOverlay?: boolean
  /** 'default' = 620px, 'large' = 880px */
  size?: 'default' | 'large'
  /** Класс для тела модалки (чтобы переопределять внутренние отступы) */
  bodyClassName?: string
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

export default function Modal({
  open,
  onClose,
  title,
  footer,
  children,
  closeOnOverlay = true,
  size = 'default',
  bodyClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(open, panelRef)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  // БЕЗ вложенных бэктиков — безопасно для esbuild/Netlify
  const panelClasses = [
    size === 'large' ? 'w-[880px]' : 'w-[620px]',
    'max-w-[95vw]',
    'rounded-2xl',
    'bg-white',
    'shadow-xl',
    'outline-none',
    'ring-1',
    'ring-black/5',
  ].join(' ')

  const content = (
    <div
      className="fixed inset-0 z-[100]"
      onMouseDown={() => { if (closeOnOverlay) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          className={panelClasses}
          tabIndex={-1}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {(title || onClose) && (
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="text-base font-medium">{title}</div>
              <button
                onClick={onClose}
                className="px-2 py-1 rounded-lg hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          )}
          <div className={bodyClassName ?? 'px-5 py-4'}>{children}</div>
          {footer && <div className="px-5 py-4 border-t bg-gray-50 rounded-b-2xl">{footer}</div>}
        </div>
      </div>
    </div>
  )
  return createPortal(content, document.body)
}
