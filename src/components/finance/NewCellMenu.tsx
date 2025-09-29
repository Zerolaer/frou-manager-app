import React from 'react'
import { Copy, Clipboard } from 'lucide-react'
import ContextMenu from './ContextMenu'

type Props = {
  x: number
  y: number
  onClose: () => void
  canCopy: boolean
  hasClipboard: boolean
  onCopy: () => void
  onPaste: () => void
}

export default function NewCellMenu({ x, y, onClose, canCopy, hasClipboard, onCopy, onPaste }: Props) {
  const handleItemClick = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <ContextMenu x={x} y={y} onClose={onClose}>
      {canCopy && (
        <div
          className="ctx-item"
          onClick={() => handleItemClick(onCopy)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#374151',
            transition: 'background-color 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <Copy className="w-4 h-4" />
          Копировать записи
        </div>
      )}
      {hasClipboard && (
        <div
          className="ctx-item"
          onClick={() => handleItemClick(onPaste)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#374151',
            transition: 'background-color 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <Clipboard className="w-4 h-4" />
          Вставить записи (заменить)
        </div>
      )}
    </ContextMenu>
  )
}
