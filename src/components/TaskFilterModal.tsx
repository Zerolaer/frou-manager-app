import React from 'react'
import { X, Filter } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ProjectDropdown from './ProjectDropdown'
import type { Project } from '@/types/shared'

export interface TaskFilters {
  project?: string
  status?: 'open' | 'closed' | 'all'
  priority?: 'low' | 'normal' | 'medium' | 'high' | 'all'
  hasDescription?: boolean
  hasTodos?: boolean
}

interface TaskFilterModalProps {
  open: boolean
  onClose: () => void
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
  projects: Project[]
}

export default function TaskFilterModal({
  open,
  onClose,
  filters,
  onFiltersChange,
  projects
}: TaskFilterModalProps) {
  const { t } = useTranslation()
  const [localFilters, setLocalFilters] = React.useState<TaskFilters>(filters)

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
    const emptyFilters: TaskFilters = {
      status: 'all',
      priority: 'all'
    }
    setLocalFilters(emptyFilters)
    onFiltersChange(emptyFilters)
    onClose()
  }

  if (!open) return null

  const hasActiveFilters = 
    localFilters.project || 
    (localFilters.status && localFilters.status !== 'all') ||
    (localFilters.priority && localFilters.priority !== 'all') ||
    localFilters.hasDescription ||
    localFilters.hasTodos

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
              {t('tasks.filterTasks')}
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
          {/* Project filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('projects.project')}
            </label>
            <ProjectDropdown
              value={localFilters.project || ''}
              projects={projects}
              onChange={(projectId) => setLocalFilters({ ...localFilters, project: projectId || undefined })}
            />
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.status')}
            </label>
            <div className="flex gap-2">
              {['all', 'open', 'closed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setLocalFilters({ ...localFilters, status: status as any })}
                  className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                    (localFilters.status || 'all') === status
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {status === 'all' ? t('common.all') : status === 'open' ? t('tasks.open') : t('tasks.closed')}
                </button>
              ))}
            </div>
          </div>

          {/* Priority filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.priority')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['all', 'low', 'normal', 'medium', 'high'].map((priority) => (
                <button
                  key={priority}
                  onClick={() => setLocalFilters({ ...localFilters, priority: priority as any })}
                  className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                    (localFilters.priority || 'all') === priority
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {priority === 'all' ? t('common.all') : priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Additional filters */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localFilters.hasDescription || false}
                onChange={(e) => setLocalFilters({ ...localFilters, hasDescription: e.target.checked ? true : undefined })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{t('tasks.hasDescription')}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localFilters.hasTodos || false}
                onChange={(e) => setLocalFilters({ ...localFilters, hasTodos: e.target.checked ? true : undefined })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{t('tasks.hasSubtasks')}</span>
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
            {t('common.apply')} {hasActiveFilters ? `(${Object.keys(localFilters).filter(k => localFilters[k as keyof TaskFilters]).length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

