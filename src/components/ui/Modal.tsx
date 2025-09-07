import React, { useEffect, useRef } from 'react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  subTitle?: React.ReactNode
  children?: React.ReactNode

  /** New slots */
  footerStart?: React.ReactNode
  footerEnd?: React.ReactNode

  /** Back-compat: legacy single footer renders on the right side */
  footer?: React.ReactNode
}

export default function Modal({
  open,
  onClose,
  title,
  subTitle,
  children,
  footerStart,
  footerEnd,
  footer,
}: ModalProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose?.()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[999]">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-12 sm:top-24 w-auto sm:w-[620px] bg-white rounded-2xl shadow-xl outline-none"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title && <h2 className="text-base font-semibold leading-6 truncate">{title}</h2>}
              {subTitle && <p className="text-xs text-gray-500 mt-0.5">{subTitle}</p>}
            </div>
            <button
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
              className="shrink-0 p-2 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[70vh] overflow-auto">
          {children}
        </div>

        {/* Footer with two zones (left/right) */}
        {(footerStart || footerEnd || footer) && (
          <div className="px-5 py-3 border-t border-gray-100">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">{footerStart}</div>
              <div className="flex items-center gap-2">
                {footerEnd ?? footer}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
