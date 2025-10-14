import React, { useState } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { useForm } from '@/hooks/useForm'
import { useTodoManager } from '@/hooks/useTodoManager'
import { ProjectDropdown, DateDropdown, PriorityDropdown } from '@/components/ui/UnifiedDropdown'
import { CoreInput, CoreTextarea } from '@/components/ui/CoreInput'
import MobileModal from '@/components/ui/MobileModal'
import { ModalButton } from '@/components/ui/ModalSystem'
import { logger } from '@/lib/monitoring'
import type { Todo } from '@/types/shared'
import { RecurringTaskSettings } from '@/types/recurring'

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (title: string, description: string, priority: string, tag: string, todos: Todo[], projectId?: string, date?: Date, recurringSettings?: RecurringTaskSettings) => Promise<void> | void
  dateLabel: string
  projects?: { id: string; name: string }[]
  activeProject?: string | null
  initialDate?: Date
}

export default function MobileTaskAddModal({ 
  open, 
  onClose, 
  onSubmit, 
  dateLabel, 
  projects = [], 
  activeProject, 
  initialDate 
}: Props) {
  const { t } = useSafeTranslation()
  const [recurringSettings, setRecurringSettings] = useState<RecurringTaskSettings>({ isRecurring: false })

  // Initialize form with validation
  const form = useForm({
    initialValues: {
      title: '',
      description: '',
      priority: 'normal' as 'low'|'normal'|'high',
      tag: '',
      projectId: (activeProject && activeProject !== 'ALL') ? activeProject : '',
      selectedDate: initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    },
    validation: {
      title: (value) => !value.trim() ? t('validation.titleRequired') : undefined,
      priority: (value) => !['low', 'normal', 'high'].includes(value) ? t('validation.invalidPriority') : undefined
    }
  })

  // Todo management
  const todoManager = useTodoManager()

  const handleSubmit = async () => {
    await form.submit(async (values) => {
      try {
        const finalRecurringSettings = recurringSettings.isRecurring ? recurringSettings : undefined
        
        logger.debug('📝 MobileTaskAddModal save with projectId:', { 
          projectId: values.projectId, 
          type: typeof values.projectId 
        })
        
        await onSubmit(
          values.title,
          values.description,
          values.priority,
          values.tag,
          todoManager.todos,
          values.projectId,
          new Date(values.selectedDate),
          finalRecurringSettings
        )
      
        // Reset form
        form.reset()
        todoManager.clearTodos()
        setRecurringSettings({ isRecurring: false })
        
      } catch (error) {
        logger.error('❌ Error creating task:', error)
        throw error
      }
    })
  }

  return (
    <MobileModal
      open={open}
      onClose={onClose}
      title={t('tasks.addTask')}
      footer={
        <div className="flex gap-3 p-4">
          <ModalButton
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            {t('actions.cancel')}
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleSubmit}
            loading={form.isSubmitting}
            disabled={!form.isValid || !form.fields.title.value.trim()}
            className="flex-1"
          >
            {t('tasks.createTask')}
          </ModalButton>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        {/* Заголовок */}
        <div>
          <CoreInput
            value={form.fields.title.value}
            onChange={(e) => form.fields.title.setValue(e.target.value)}
            placeholder={t('tasks.taskTitle')}
            className="text-base"
            autoFocus
          />
          {form.fields.title.error && (
            <div className="text-red-500 text-sm mt-1">{form.fields.title.error}</div>
          )}
        </div>

        {/* Описание */}
        <div>
          <CoreTextarea
            value={form.fields.description.value}
            onChange={(e) => form.fields.description.setValue(e.target.value)}
            placeholder={t('tasks.taskDescription')}
            rows={3}
          />
        </div>

        {/* Проект и Дата */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.project')}
            </label>
            <ProjectDropdown
              value={form.fields.projectId.value}
              onChange={form.fields.projectId.setValue}
              projects={projects}
              placeholder={t('tasks.selectProject')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.date')}
            </label>
            <DateDropdown
              value={form.fields.selectedDate.value}
              onChange={form.fields.selectedDate.setValue}
              placeholder={dateLabel}
            />
          </div>
        </div>

        {/* Приоритет и Тег */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.priority')}
            </label>
            <PriorityDropdown
              value={form.fields.priority.value}
              onChange={form.fields.priority.setValue}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.tag')}
            </label>
            <CoreInput
              value={form.fields.tag.value}
              onChange={(e) => form.fields.tag.setValue(e.target.value)}
              placeholder={t('tasks.tagPlaceholder')}
            />
          </div>
        </div>

        {/* Подзадачи */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              {t('tasks.subtasks')}
            </label>
            <button
              type="button"
              onClick={todoManager.addTodo}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('tasks.addSubtask')}
            </button>
          </div>
          
          <div className="space-y-2">
            {todoManager.todos.map((todo) => (
              <div key={todo.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <button
                  type="button"
                  onClick={() => todoManager.toggleTodo(todo.id)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    todo.done 
                      ? 'bg-gray-900 border-gray-900 text-white' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {todo.done && <Check className="w-3 h-3" />}
                </button>
                <input
                  type="text"
                  value={todo.text}
                  onChange={(e) => todoManager.updateTodo(todo.id, e.target.value)}
                  placeholder={t('tasks.subtaskPlaceholder')}
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => todoManager.removeTodo(todo.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          
          {todoManager.todos.length === 0 && (
            <div className="text-center py-6 text-gray-500 text-sm">
              {t('tasks.noSubtasks')}
            </div>
          )}
        </div>
      </div>
    </MobileModal>
  )
}
