import React from 'react'
import { X, Filter } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useForm } from '@/hooks/useForm'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
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
  const { createStandardFooter } = useModalActions()

  // Initialize form with current filters
  const form = useForm({
    initialValues: {
      project: filters.project || '',
      status: filters.status || 'all' as 'open' | 'closed' | 'all',
      priority: filters.priority || 'all' as 'low' | 'normal' | 'medium' | 'high' | 'all',
      hasDescription: filters.hasDescription || false,
      hasTodos: filters.hasTodos || false
    }
  })

  // Update form when filters change
  React.useEffect(() => {
    if (open) {
      form.setField('project', filters.project || '')
      form.setField('status', filters.status || 'all')
      form.setField('priority', filters.priority || 'all')
      form.setField('hasDescription', filters.hasDescription || false)
      form.setField('hasTodos', filters.hasTodos || false)
    }
  }, [open, filters])

  const handleApply = async () => {
    const values = form.fields
    const newFilters: TaskFilters = {
      project: values.project.value || undefined,
      status: values.status.value !== 'all' ? values.status.value : undefined,
      priority: values.priority.value !== 'all' ? values.priority.value : undefined,
      hasDescription: values.hasDescription.value ? true : undefined,
      hasTodos: values.hasTodos.value ? true : undefined
    }
    
    onFiltersChange(newFilters)
    onClose()
  }

  const handleReset = () => {
    const emptyFilters: TaskFilters = {
      status: 'all',
      priority: 'all'
    }
    form.reset()
    onFiltersChange(emptyFilters)
    onClose()
  }

  const hasActiveFilters = 
    form.fields.project.value || 
    (form.fields.status.value && form.fields.status.value !== 'all') ||
    (form.fields.priority.value && form.fields.priority.value !== 'all') ||
    form.fields.hasDescription.value ||
    form.fields.hasTodos.value

  return (
    <UnifiedModal
      open={open}
      onClose={onClose}
      title={t('tasks.filterTasks')}
      size="md"
      footer={createStandardFooter(
        { 
          label: `${t('common.apply')}${hasActiveFilters ? ` (${Object.values(form.fields).filter(f => f.value && f.value !== 'all' && f.value !== false).length})` : ''}`, 
          onClick: handleApply, 
          loading: form.isSubmitting
        },
        { label: t('common.reset'), onClick: handleReset, variant: 'outline' }
      )}
    >
      <div className="space-y-6">
        {/* Project filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('projects.project')}
          </label>
          <ProjectDropdown
            value={form.fields.project.value}
            projects={projects}
            onChange={(projectId) => form.setField('project', projectId || '')}
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
                onClick={() => form.setField('status', status as any)}
                className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                  form.fields.status.value === status
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
                onClick={() => form.setField('priority', priority as any)}
                className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                  form.fields.priority.value === priority
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
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.fields.hasDescription.value}
              onChange={(e) => form.setField('hasDescription', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{t('tasks.hasDescription')}</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.fields.hasTodos.value}
              onChange={(e) => form.setField('hasTodos', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{t('tasks.hasSubtasks')}</span>
          </label>
        </div>
      </div>
    </UnifiedModal>
  )
}

