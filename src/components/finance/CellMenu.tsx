import React, { useEffect, useRef } from 'react'
import { Copy, Clipboard } from 'lucide-react'

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
  const menuRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleItemClick = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <>
      <div 
        ref={backdropRef}
        className="ctx-backdrop" 
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div
        ref={menuRef}
        className="ctx-menu"
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 1000
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {canCopy && (
          <div
            className="ctx-item"
            onClick={() => handleItemClick(onCopy)}
          >
            <Copy className="w-4 h-4" />
            Копировать записи
          </div>
        )}
        {hasClipboard && (
          <div
            className="ctx-item"
            onClick={() => handleItemClick(onPaste)}
          >
            <Clipboard className="w-4 h-4" />
            Вставить записи (заменить)
          </div>
        )}
      </div>
    </>
  )
}