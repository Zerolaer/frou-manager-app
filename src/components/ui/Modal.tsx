import React, { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import ModalHeader from './ModalHeader'
import ModalFooter from './ModalFooter'

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
  /** 'default' = 500px, 'large' = 880px, 'cell' = 680px. Legacy support: 'sm'|'md'|'lg'|'xl' map to 'default'|'large' */
  size?: 'default' | 'large' | 'cell' | 'sm' | 'md' | 'lg' | 'xl'
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

const Modal = ({
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
}: ModalProps) => {
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

  // Map legacy sizes to new sizes
  const actualSize = size === 'cell' ? 'cell' : (size === 'sm' || size === 'md' ? 'default' : (size === 'lg' || size === 'xl') ? 'large' : size)
  
  // БЕЗ вложенных бэктиков — безопасно для esbuild/Netlify
  const panelClasses = [
    actualSize === 'cell' ? 'w-[680px]' : 'w-[500px]',
    'max-w-[95vw]',
    'rounded-2xl',
    'bg-white',
    'shadow-2xl',
    'outline-none',
    'ring-1',
    'ring-black/10',
    'border',
    'border-gray-200',
  ].join(' ')

  const content = (
    <div
      className="fixed inset-0 z-[100] opacity-100"
      onMouseDown={() => { if (closeOnOverlay) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          className={`${panelClasses} transition-all duration-300 ease-out ${
            !isAnimating 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-2'
          }`}
          tabIndex={-1}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {title && (
            <ModalHeader 
              title={
                <div className="flex items-center">
                  <span id="modal-title">{title}</span>
                  {subTitle && <span className="ml-2 text-sm opacity-70">{subTitle}</span>}
                </div>
              } 
              onClose={onClose}
              rightContent={headerRight}
            />
          )}
          <div className={bodyClassName ?? 'px-5 py-4'}>
            <div className={`w-auto ${contentClassName ?? ''} mx-auto`}>
              {children}
            </div>
          </div>
          {footer && <ModalFooter>{footer}</ModalFooter>}
        </div>
      </div>
    </div>
  )
  return createPortal(content, document.body)
};

export default Modal;
