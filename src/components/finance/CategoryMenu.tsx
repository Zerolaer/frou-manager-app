import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import CoreMenu from '@/components/ui/CoreMenu'
import { Edit, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Pos = { x: number; y: number }

type Props = {
  pos: Pos
  onClose: () => void
  onRename: () => void
  onAddSub: () => void
  canAddSub?: boolean
  addSubBlocked?: boolean
  onDelete: () => void
}

export default function CategoryMenu({ pos, onClose, onRename, onAddSub, onDelete, canAddSub, addSubBlocked }: Props) {
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
    { value: 'rename', label: t('actions.edit'), icon: <Edit className="w-4 h-4" /> },
    ...(canAddSub ? [{ value: 'addsub', label: t('finance.subcategory'), icon: <Plus className="w-4 h-4" /> }] : []),
    ...(addSubBlocked ? [{ value: 'addsub-blocked', label: t('finance.subcategory'), icon: <Plus className="w-4 h-4" />, disabled: true, title: t('finance.cannotAddSubcategory') }] : []),
    { value: 'delete', label: t('actions.delete'), icon: <Trash2 className="w-4 h-4" />, destructive: true }
  ]

  return createPortal(
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 1000
        }}
      >
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-max min-w-0 max-w-[min(320px,calc(100vw-16px))]">
          {options.map((option) => (
            <button
              key={option.value}
              disabled={'disabled' in option && option.disabled}
              title={'title' in option ? option.title : undefined}
              onClick={() => {
                if ('disabled' in option && option.disabled) return
                if (option.value === 'rename') onRename()
                if (option.value === 'addsub') onAddSub()
                if (option.value === 'delete') onDelete()
                onClose()
              }}
              className={`w-full px-2 py-3 text-left transition-colors rounded-lg flex items-center gap-2 ${
                option.destructive
                  ? 'text-red-600 hover:bg-red-50'
                  : 'disabled' in option && option.disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-100'
              }`}
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
