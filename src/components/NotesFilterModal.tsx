import React, { useState } from 'react'
import { X, Filter } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface NotesFilters {
  pinned?: boolean
  hasContent?: boolean
  searchInContent?: boolean
}

interface NotesFilterModalProps {
  open: boolean
  onClose: () => void
  filters: NotesFilters
  onFiltersChange: (filters: NotesFilters) => void
}

export default function NotesFilterModal({
  open,
  onClose,
  filters,
  onFiltersChange
}: NotesFilterModalProps) {
  const { t } = useTranslation()
  const [localFilters, setLocalFilters] = useState<NotesFilters>(filters)

  React.useEffect(() => {
    if (open) {
      setLocalFilters(filters)
    }
  }, [open, filters])

  const handleApply = () => {
    onFiltersChange(localFilters)
    onClose()
  }

  const handleReset = () => {
    const emptyFilters: NotesFilters = {}
    setLocalFilters(emptyFilters)
    onFiltersChange(emptyFilters)
    onClose()
  }

  if (!open) return null

  const hasActiveFilters = Object.keys(localFilters).length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              {t('notes.filterNotes') || 'Фильтр заметок'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localFilters.pinned || false}
                onChange={(e) => setLocalFilters({ ...localFilters, pinned: e.target.checked ? true : undefined })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                📌 {t('notes.showOnlyPinned') || 'Только закрепленные'}
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localFilters.hasContent || false}
                onChange={(e) => setLocalFilters({ ...localFilters, hasContent: e.target.checked ? true : undefined })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                📝 {t('notes.showOnlyWithContent') || 'Только с содержимым'}
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localFilters.searchInContent || false}
                onChange={(e) => setLocalFilters({ ...localFilters, searchInContent: e.target.checked ? true : undefined })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                🔍 {t('notes.searchInContent') || 'Искать в содержимом'}
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors font-medium"
          >
            {t('common.reset')}
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            {t('common.apply')} {hasActiveFilters ? `(${Object.keys(localFilters).filter(k => localFilters[k as keyof NotesFilters]).length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

