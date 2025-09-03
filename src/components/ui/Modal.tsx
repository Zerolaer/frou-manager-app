import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  /** If true, clicking on overlay closes the modal (default true) */
  closeOnOverlay?: boolean

  size?: 'default' | 'large'
}

function useFocusTrap(enabled: boolean, containerRef: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return
    const container = containerRef.current
    const selectors = [
      'a[href]','area[href]','input:not([disabled])','select:not([disabled])','textarea:not([disabled])',
      'button:not([disabled])','iframe','object','embed','[tabindex]:not([tabindex="-1"])','[contenteditable=true]'
    ]
    const getFocusable = () => Array.from(container.querySelectorAll<HTMLElement>(selectors.join(',')))
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusables = getFocusable()
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }
    container.addEventListener('keydown', onKey)
    // focus the first element
    const focusables = getFocusable()
    ;(focusables[0] ?? container).focus()
    return () => container.removeEventListener('keydown', onKey)
  }, [enabled, containerRef])
}

export default function Modal({ open, onClose, title, footer, children, closeOnOverlay = TrueDefault, size = 'default' }: ModalProps){
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(open, panelRef)

  // Close on Esc
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Prevent scroll on body
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      className="fixed inset-0 z-50"
      ref={overlayRef}
      onMouseDown={(e) => {
        if (!closeOnOverlay) return
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          className={`w-full max-w-[${size === "large" ? "880px" : "620px"}] rounded-2xl` bg-white shadow-xl outline-none ring-1 ring-black/5"
          tabIndex={-1}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {(title || onClose) && (
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="text-base font-medium">{title}</div>
              <button
                onClick={onClose}
                className="px-2 py-1 rounded-lg hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
          )}
          <div className="px-5 py-4">{children}</div>
          {footer && <div className="px-5 py-4 border-t bg-gray-50 rounded-b-2xl">{footer}</div>}
        </div>
      </div>
    </div>
  )
  return createPortal(content, document.body)
}

// tiny helper because default props with bool + destructuring is messy
function TrueDefault(){ return true as unknown as boolean }
