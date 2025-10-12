import { logger } from '@/lib/monitoring'
import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { useForm } from '@/hooks/useForm'
import { useTodoManager } from '@/hooks/useTodoManager'
import { useNotificationContext } from './NotificationProvider'
import { ProjectDropdown, DateDropdown, PriorityDropdown } from './ui/UnifiedDropdown'
import { CoreInput, CoreTextarea } from './ui/CoreInput'
import { Plus, Trash2, Check } from 'lucide-react'
import RecurringTaskSettings from './RecurringTaskSettings'
import { RecurringTaskSettings as RecurringSettings } from '@/types/recurring'

type Todo = { id: string; text: string; done: boolean }

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (title: string, description: string, priority: string, tag: string, todos: Todo[], projectId?: string, date?: Date, recurringSettings?: RecurringSettings) => Promise<void> | void
  dateLabel: string
  projects?: { id: string; name: string }[]
  activeProject?: string | null
  initialDate?: Date
}

export default function TaskAddModal({ open, onClose, onSubmit, dateLabel, projects = [], activeProject, initialDate }: Props){
  const { t } = useSafeTranslation()
  const { createStandardFooter } = useModalActions()
  const notifications = useNotificationContext()
  const [recurringSettings, setRecurringSettings] = useState<RecurringSettings>({ isRecurring: false })

  // Initialize form with validation
  const form = useForm({
    initialValues: {
      title: '',
      description: '',
      priority: 'normal' as 'low'|'normal'|'high',
      tag: '',
      projectId: (activeProject && activeProject !== 'ALL') ? activeProject : '',
      selectedDate: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    },
    validation: {
      title: (value) => !value.trim() ? t('validation.titleRequired') : undefined,
      priority: (value) => !['low', 'normal', 'high'].includes(value) ? t('validation.invalidPriority') : undefined
    }
  })

  // Todo management
  const todoManager = useTodoManager()

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset()
      todoManager.clearTodos()
      setRecurringSettings({ isRecurring: false })
      // Set initial values
      form.setField('projectId', (activeProject && activeProject !== 'ALL') ? activeProject : '')
      if (initialDate) {
        form.setField('selectedDate', format(initialDate, 'yyyy-MM-dd'))
      }
    }
  }, [open, activeProject, initialDate])

  // Submit handler
      const handleSubmit = async () => {
        await form.submit(async (values) => {
          try {
            const finalRecurringSettings = recurringSettings.isRecurring ? recurringSettings : undefined
            
            logger.debug('📝 TaskAddModal save with projectId:', { 
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
        
        // Show success notification
        notifications.showSuccess(t('tasks.taskCreated') || 'Задача создана!')
        
        // Reset and close
        form.reset()
        todoManager.clearTodos()
        onClose()
      } catch (error) {
        logger.error('Failed to create task:', error)
        notifications.showError(t('tasks.createError') || 'Ошибка при создании задачи')
      }
    })
  }

  return (
    <UnifiedModal
      size="lg"
      open={open}
      onClose={onClose}
      title={t('tasks.newTask')}
      subtitle={dateLabel}
      variant="side"
      footer={createStandardFooter(
        { 
          label: t('actions.add'), 
          onClick: handleSubmit, 
          loading: form.isSubmitting, 
          disabled: !form.isValid || !form.fields.title.value.trim()
        },
        { label: t('actions.cancel'), onClick: onClose }
      )}
    >
      <div className="space-y-6">
        {/* Проект и Дата */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.project') || 'Проект'}
            </label>
            <ProjectDropdown
              projects={projects}
              value={form.fields.projectId.value}
              onChange={(value) => form.setField('projectId', String(value))}
              buttonClassName="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.date') || 'Дата'}
            </label>
            <DateDropdown
              value={form.fields.selectedDate.value}
              onChange={(date) => form.setField('selectedDate', String(date))}
              buttonClassName="w-full"
            />
          </div>
        </div>

        {/* Заголовок */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('tasks.title') || 'Название задачи'} <span className="text-red-500">*</span>
          </label>
          <CoreInput
            value={form.fields.title.value}
            onChange={(e) => form.setField('title', e.target.value)}
            onBlur={() => form.setTouched('title')}
            placeholder={t('tasks.titlePlaceholder') || 'Введите название задачи'}
            className={form.fields.title.touched && form.fields.title.error ? 'border-red-300' : ''}
          />
          {form.fields.title.touched && form.fields.title.error && (
            <p className="text-sm text-red-600 mt-1">{form.fields.title.error}</p>
          )}
        </div>

        {/* Описание */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('tasks.description') || 'Описание'}
          </label>
          <CoreTextarea
            value={form.fields.description.value}
            onChange={(e) => form.setField('description', e.target.value)}
            placeholder={t('tasks.descriptionPlaceholder') || 'Введите описание задачи'}
            rows={3}
          />
        </div>

        {/* Приоритет и Тег */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.priority') || 'Приоритет'}
            </label>
            <PriorityDropdown
              value={form.fields.priority.value}
              onChange={(value) => form.setField('priority', String(value))}
              buttonClassName="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.tag') || 'Тег'}
            </label>
            <CoreInput
              value={form.fields.tag.value}
              onChange={(e) => form.setField('tag', e.target.value)}
              placeholder={t('tasks.tagPlaceholder') || 'Введите тег'}
            />
          </div>
        </div>

        {/* Todo список */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('tasks.todos') || 'Подзадачи'}
          </label>
          
          <div className="space-y-2">
            {todoManager.todos.map(todo => (
              <div key={todo.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <button
                  onClick={() => todoManager.toggleTodo(todo.id)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    todo.done 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {todo.done && <Check className="w-3 h-3" />}
                </button>
                
                <span className={`flex-1 text-sm ${todo.done ? 'line-through text-gray-500' : ''}`}>
                  {todo.text}
                </span>
                
                <button
                  onClick={() => todoManager.removeTodo(todo.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2 mt-2">
            <CoreInput
              value={todoManager.newTodo || ''}
              onChange={(e) => todoManager.setNewTodo(e.target.value)}
              placeholder={t('tasks.addTodo') || 'Добавить подзадачу'}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  todoManager.addTodo()
                }
              }}
            />
            <button
              onClick={() => todoManager.addTodo()}
              disabled={!todoManager.newTodo?.trim()}
              className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Настройки повторения */}
        <RecurringTaskSettings
          settings={recurringSettings}
          onChange={setRecurringSettings}
          startDate={form.fields.selectedDate.value}
        />
      </div>
    </UnifiedModal>
  )
}
