
import React, { useEffect, useMemo, useRef, useState } from 'react'

type Pos = { x: number; y: number }

type Props = {
  pos: Pos
  onClose: () => void
  canCopy: boolean
  hasClipboard: boolean
  onCopy: () => void
  onPaste: () => void
}

export default function CellMenu({ pos, onClose, canCopy, hasClipboard, onCopy, onPaste }: Props){
  const visibleItems = useMemo(() => {
    const items: Array<{ label: string; onClick: () => void; aria: string }> = []
    if (canCopy) items.push({ label: 'Копировать записи', onClick: onCopy, aria: 'Копировать записи' })
    if (hasClipboard) items.push({ label: 'Вставить записи (заменить)', onClick: onPaste, aria: 'Вставить записи (заменить)' })
    return items
  }, [canCopy, hasClipboard, onCopy, onPaste])

  const itemsRef = useRef<Array<HTMLDivElement | null>>([])
  const [active, setActive] = useState(0)

  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(p => Math.min(p + 1, visibleItems.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(p => Math.max(p - 1, 0)) }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        itemsRef.current[active]?.click()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, onClose, visibleItems.length])

  useEffect(()=>{
    itemsRef.current[0]?.focus()
  }, [visibleItems.length])

  return (
    <>
      <div className="ctx-backdrop" onClick={onClose} onContextMenu={(e)=>e.preventDefault()} aria-hidden />
      <div
        className="ctx-menu"
        style={{ 
          left: pos.x, 
          top: pos.y,
          position: 'fixed',
          zIndex: 1000
        }}
        role="menu"
        aria-label="Действия с ячейкой"
        onContextMenu={(e)=>e.preventDefault()}
      >
        {visibleItems.map((it, idx) => (
          <div
            key={idx}
            ref={el => itemsRef.current[idx] = el}
            className="ctx-item"
            role="menuitem"
            tabIndex={0}
            onClick={it.onClick}
            aria-label={it.aria}
            data-active={active===idx}
          >
            {it.label}
          </div>
        ))}
      </div>
    </>
  )
}
