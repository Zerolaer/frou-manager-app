import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  subTitle?: React.ReactNode
  footer?: React.ReactNode
  headerRight?: React.ReactNode
  children: React.ReactNode
  /** Если true — клик по оверлею закрывает модалку (по умолчанию true) */
  closeOnOverlay?: boolean
  /** 'default' = 620px, 'large' = 880px. Legacy support: 'sm'|'md'|'lg'|'xl' map to 'default'|'large' */
  size?: 'default' | 'large' | 'sm' | 'md' | 'lg' | 'xl'
  /** Extra classes on outer container (kept for back-compat) */
  className?: string
  /** Extra classes on content panel */
  contentClassName?: string
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
  subTitle,
  footer,
  headerRight,
  children,
  closeOnOverlay = true,
  size = 'default',
  className,
  contentClassName,
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

  // Map legacy sizes to new sizes
  const actualSize = size === 'sm' || size === 'md' ? 'default' : (size === 'lg' || size === 'xl') ? 'large' : size
  
  // БЕЗ вложенных бэктиков — безопасно для esbuild/Netlify
  const panelClasses = [
    actualSize === 'large' ? 'w-[880px]' : 'w-[620px]',
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
          {(title || subTitle || onClose) && (
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <div className="flex items-center">
                <div className="text-sm text-gray-600 font-normal leading-tight" id="modal-title">{title}</div>
                {subTitle && <div className="ml-2 text-xs opacity-70">{subTitle}</div>}
              </div>
              <div className="flex items-center gap-2">
                {headerRight && <div className="flex items-center">{headerRight}</div>}
              </div>
            </div>
          )}
          <div className={bodyClassName ?? 'px-5 py-4'}>
            <div className={`w-auto ${contentClassName ?? ''} mx-auto`}>
              {children}
            </div>
          </div>
          {footer && <div className="px-5 py-3 border-t bg-gray-50 rounded-b-2xl">{footer}</div>}
        </div>
      </div>
    </div>
  )
  return createPortal(content, document.body)
}
