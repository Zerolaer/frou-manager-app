import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Clipboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Pos = { x: number; y: number }

type Props = {
  pos: Pos
  onClose: () => void
  canCopy: boolean
  hasClipboard: boolean
  onCopy: () => void
  onPaste: () => void
}

export default function CellMenu({ pos, onClose, canCopy, hasClipboard, onCopy, onPaste }: Props) {
  const { t } = useTranslation()
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const options = [
    ...(canCopy ? [{ value: 'copy', label: t('finance.copyRecords'), icon: <Copy className="w-4 h-4" /> }] : []),
    ...(hasClipboard ? [{ value: 'paste', label: t('finance.pasteRecords'), icon: <Clipboard className="w-4 h-4" /> }] : [])
  ]

  if (options.length === 0) {
    onClose()
    return null
  }

  return createPortal(
    <>
      <div 
        className="fixed inset-0 z-10" 
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 1000
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-60">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                if (option.value === 'copy') onCopy()
                if (option.value === 'paste') onPaste()
                onClose()
              }}
              className="w-full px-2 py-3 text-left transition-colors rounded-lg flex items-center gap-2 text-gray-700 hover:bg-gray-100"
              style={{ fontSize: '13px' }}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body
  )
}
