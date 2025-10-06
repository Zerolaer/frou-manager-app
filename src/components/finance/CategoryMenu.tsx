
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
      <div className="ctx-backdrop" onClick={onClose} onContextMenu={(e)=>e.preventDefault()} aria-hidden />
      <div
        ref={menuRef}
        className="ctx-menu"
        style={{ 
          left: pos.x, 
          top: pos.y,
          position: 'fixed',
          zIndex: 1000
        }}
        role="menu"
        aria-label="Действия с категорией"
        onContextMenu={(e)=>e.preventDefault()}
      >
        <div
          ref={el => itemsRef.current[0] = el}
          className="ctx-item"
          role="menuitem"
          tabIndex={0}
          onClick={onRename}
          aria-label="Переименовать категорию"
          data-active={active===0}
        >
          <Edit className="w-4 h-4" />
          Переименовать
        </div>
        {(canAddSub ?? true) && (<div
          ref={el => itemsRef.current[1] = el}
          className="ctx-item"
          role="menuitem"
          tabIndex={0}
          onClick={onAddSub}
          aria-label="Добавить подкатегорию"
          data-active={active===1}
        >
          <Plus className="w-4 h-4" />
          Подкатегория
        </div>)}
        <div
          ref={el => itemsRef.current[2] = el}
          className="ctx-item"
          role="menuitem"
          tabIndex={0}
          onClick={onDelete}
          aria-label="Удалить категорию"
          data-active={active===2}
          style={{color:'#dc2626'}}
        >
          <Trash2 className="w-4 h-4" />
          Удалить
        </div>
      </div>
    </>
  )
}
