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
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div
      className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto p-2 w-60"
      style={{ 
        left: x, 
        top: y,
        position: 'fixed',
        zIndex: 1000
      }}
      role="menu"
      aria-label="Действия с категорией"
    >
      <button
        className="w-full px-2 py-3 text-left transition-colors text-gray-700 hover:bg-gray-100"
        style={{ fontSize: '15px' }}
        onClick={() => handleItemClick(onRename)}
      >
        <div className="flex items-center gap-2">
          <Edit className="w-4 h-4" />
          Переименовать
        </div>
      </button>
      
      {(canAddSub ?? true) && (
        <button
          className="w-full px-2 py-3 text-left transition-colors text-gray-700 hover:bg-gray-100"
          style={{ fontSize: '15px' }}
          onClick={() => handleItemClick(onAddSub)}
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Подкатегория
          </div>
        </button>
      )}
      
      <button
        className="w-full px-2 py-3 text-left transition-colors text-gray-700 hover:bg-gray-100"
        style={{ fontSize: '15px', color: '#dc2626' }}
        onClick={() => handleItemClick(onDelete)}
      >
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Удалить
        </div>
      </button>
      </div>
    </>
  )
}
