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
}: SideModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

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

  const content = (
    <div
      className="fixed inset-0 z-[100] opacity-100"
      onMouseDown={onClose}
    >
      {/* Overlay with backdrop blur */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      
      {/* Side panel */}
      <div 
        className="absolute right-0 top-0 bottom-0 flex items-center justify-end pr-4"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          ref={panelRef}
          className={`w-[40vw] h-[calc(100vh-32px)] my-4 rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ease-out ${
            !isAnimating 
              ? 'opacity-100 translate-x-0' 
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

