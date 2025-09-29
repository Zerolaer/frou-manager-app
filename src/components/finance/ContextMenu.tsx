import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  x: number
  y: number
  onClose: () => void
  children: React.ReactNode
}

export default function ContextMenu({ x, y, onClose, children }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPos, setAdjustedPos] = useState({ x, y })

  // Умное позиционирование - не выходить за границы экрана
  useEffect(() => {
    if (!menuRef.current) return

    const menu = menuRef.current
    const rect = menu.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    let adjustedX = x
    let adjustedY = y

    // Проверяем правую границу
    if (x + rect.width > viewport.width - 8) {
      adjustedX = viewport.width - rect.width - 8
    }

    // Проверяем левую границу
    if (adjustedX < 8) {
      adjustedX = 8
    }

    // Проверяем нижнюю границу
    if (y + rect.height > viewport.height - 8) {
      adjustedY = viewport.height - rect.height - 8
    }

    // Проверяем верхнюю границу
    if (adjustedY < 8) {
      adjustedY = 8
    }

    setAdjustedPos({ x: adjustedX, y: adjustedY })
  }, [x, y])

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

  // Закрытие по клику вне меню
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Создаем портал в document.body
  return createPortal(
    <>
      <div 
        className="ctx-backdrop" 
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
          backgroundColor: 'transparent'
        }}
      />
      <div
        ref={menuRef}
        className="ctx-menu"
        style={{
          position: 'fixed',
          left: adjustedPos.x,
          top: adjustedPos.y,
          zIndex: 1000,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          minWidth: '160px',
          padding: '4px 0'
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {children}
      </div>
    </>,
    document.body
  )
}
