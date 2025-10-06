import React from 'react'
import { Edit, Trash2, Plus } from 'lucide-react'
import ContextMenu from './ContextMenu'

type Props = {
  x: number
  y: number
  onClose: () => void
  onRename: () => void
  onAddSub: () => void
  onDelete: () => void
  canAddSub?: boolean
}

export default function NewCategoryMenu({ x, y, onClose, onRename, onAddSub, onDelete, canAddSub }: Props) {
  const handleItemClick = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <ContextMenu x={x} y={y} onClose={onClose}>
      <div
        className="ctx-item"
        onClick={() => handleItemClick(onRename)}
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
        <Edit className="w-4 h-4" />
        Переименовать
      </div>
      
      {(canAddSub ?? true) && (
        <div
          className="ctx-item"
          onClick={() => handleItemClick(onAddSub)}
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
          <Plus className="w-4 h-4" />
          Подкатегория
        </div>
      )}
      
      <div
        className="ctx-item"
        onClick={() => handleItemClick(onDelete)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#dc2626',
          transition: 'background-color 0.15s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#fef2f2'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <Trash2 className="w-4 h-4" />
        Удалить
      </div>
    </ContextMenu>
  )
}
