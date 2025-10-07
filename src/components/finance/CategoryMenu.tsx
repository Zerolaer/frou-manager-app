
import React, { useEffect, useRef, useState } from 'react'
import { Edit, Plus, Trash2 } from 'lucide-react'

type Pos = { x: number; y: number }

type Props = {
  pos: Pos
  onClose: () => void
  onRename: () => void
  onAddSub: () => void
  canAddSub?: boolean
  onDelete: () => void
}

export default function CategoryMenu({ pos, onClose, onRename, onAddSub, onDelete, canAddSub }: Props){
  const itemsRef = useRef<Array<HTMLDivElement | null>>([])
  const menuRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(p => Math.min(p + 1, itemsRef.current.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(p => Math.max(p - 1, 0)) }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        itemsRef.current[active]?.click()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, onClose])

  useEffect(()=>{
    itemsRef.current[0]?.focus()
  }, [])

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div
        ref={menuRef}
        className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto p-2 w-60"
        style={{ 
          left: pos.x, 
          top: pos.y,
          position: 'fixed',
          zIndex: 1000
        }}
        role="menu"
        aria-label="Действия с категорией"
      >
        <button
          ref={el => itemsRef.current[0] = el}
          className={`w-full px-2 py-3 text-left transition-colors ${
            active === 0 
              ? 'bg-black text-white font-medium' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          style={{ fontSize: '15px' }}
          role="menuitem"
          tabIndex={0}
          onClick={onRename}
          aria-label="Переименовать категорию"
        >
          <div className="flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Переименовать
          </div>
        </button>
        {(canAddSub ?? true) && (
          <button
            ref={el => itemsRef.current[1] = el}
            className={`w-full px-2 py-3 text-left transition-colors ${
              active === 1 
                ? 'bg-black text-white font-medium' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            style={{ fontSize: '15px' }}
            role="menuitem"
            tabIndex={0}
            onClick={onAddSub}
            aria-label="Добавить подкатегорию"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Подкатегория
            </div>
          </button>
        )}
        <button
          ref={el => itemsRef.current[2] = el}
          className={`w-full px-2 py-3 text-left transition-colors ${
            active === 2 
              ? 'bg-black text-white font-medium' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          style={{ fontSize: '15px', color: '#dc2626' }}
          role="menuitem"
          tabIndex={0}
          onClick={onDelete}
          aria-label="Удалить категорию"
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
