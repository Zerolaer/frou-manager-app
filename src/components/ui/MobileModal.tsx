import React, { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type MobileModalProps = {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  /** Если true — клик по оверлею закрывает модалку (по умолчанию true) */
  closeOnOverlay?: boolean
  /** Класс для тела модалки */
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

const MobileModal = ({
  open,
  onClose,
  title,
  footer,
  children,
  closeOnOverlay = true,
  bodyClassName = '',
}: MobileModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

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
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-semibold text-gray-900" id="modal-title">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}

          {/* Body */}
          <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-gray-200 bg-white">
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
