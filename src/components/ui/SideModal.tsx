import React, { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import ModalHeader from './ModalHeader'
import ModalFooter from './ModalFooter'

type SideModalProps = {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  showCloseButton?: boolean
  rightContent?: React.ReactNode
  noPadding?: boolean
  noBackdrop?: boolean // Don't render backdrop
  position?: 'left' | 'right' // Position of modal
  customZIndex?: number // Custom z-index
  disableBackdropClick?: boolean // Don't close on backdrop click
  splitView?: boolean // Enable 50/50 split view mode
}

const SideModal = ({
  open,
  onClose,
  title,
  children,
  footer,
  showCloseButton = true,
  rightContent,
  noPadding = false,
  noBackdrop = false,
  position = 'right',
  customZIndex,
  disableBackdropClick = false,
  splitView = false,
}: SideModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const onCloseRef = useRef(onClose)
  const openTimeRef = useRef<number>(0) // Track when modal was opened
  
  // Keep ref up to date
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (open) {
      setIsVisible(true)
      setIsAnimating(true)
      openTimeRef.current = Date.now() // Record opening time
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
        onCloseRef.current() 
      }
    }
    // Use bubble phase (default) - will be called after capture phase listeners
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    // Don't lock body scroll if noBackdrop - let other modals handle it
    if (noBackdrop) return
    
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
  }, [open, noBackdrop])

  if (!isVisible) return null

  const zIndex = customZIndex || 100
  const isLeft = position === 'left'
  
  const content = (
    <div
      className={`fixed inset-0 opacity-100`}
      style={{ 
        zIndex,
        pointerEvents: noBackdrop ? 'none' : 'auto' // Don't capture clicks when no backdrop
      }}
      onMouseDown={(e) => {
        // Prevent closing if clicked within 500ms of opening (prevents double-click issues)
        if (noBackdrop || disableBackdropClick) return
        const timeSinceOpen = Date.now() - openTimeRef.current
        if (timeSinceOpen < 500) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        onClose()
      }}
    >
      {/* Overlay with backdrop blur - только если не noBackdrop */}
      {!noBackdrop && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      )}
      
      {/* Side panel */}
      <div 
        className={`absolute top-0 bottom-0 flex items-center ${
          isLeft ? 'left-0 justify-start pl-4' : 'right-0 justify-end pr-4'
        }`}
        style={{ pointerEvents: 'auto' }} // Always capture clicks on the panel itself
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          ref={panelRef}
          className={`${splitView ? 'w-[calc(50vw-24px)] h-[calc(100vh-32px)] my-4 rounded-2xl' : 'w-[50vw] h-[calc(100vh-32px)] my-4 rounded-2xl'} bg-white shadow-2xl ring-1 ring-black/10 border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ease-out ${
            !isAnimating 
              ? 'opacity-100 translate-x-0' 
              : isLeft
                ? 'opacity-0 -translate-x-full'
                : 'opacity-0 translate-x-full'
          }`}
          tabIndex={-1}
        >
          {/* Header */}
          {title && <ModalHeader title={title} onClose={onClose} showCloseButton={showCloseButton} rightContent={rightContent} />}

          {/* Content */}
          <div className={`flex-1 overflow-y-auto ${noPadding ? '' : 'px-6 py-4'}`}>
            {children}
          </div>

          {/* Footer */}
          {footer && <ModalFooter>{footer}</ModalFooter>}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
};

export default SideModal;

