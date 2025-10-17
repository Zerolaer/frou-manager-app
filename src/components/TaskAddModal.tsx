import { logger } from '@/lib/monitoring'
import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { useForm } from '@/hooks/useForm'
import { useTodoManager } from '@/hooks/useTodoManager'
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
        console.log('Task created successfully')
        
        // Reset and close
        form.reset()
        todoManager.clearTodos()
        onClose()
      } catch (error) {
        logger.error('Failed to create task:', error)
        console.error('Error creating task:', error)
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
          label: t('actions.create'), 
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
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.date') || 'Дата'}
            </label>
            <DateDropdown
              value={form.fields.selectedDate.value}
              onChange={(date) => form.setField('selectedDate', String(date))}
              className="w-full"
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
              className="w-full"
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              {t('tasks.todos') || 'Подзадачи'}
            </label>
            {todoManager.todos.length > 0 && (
              <span className="text-sm text-gray-500">
                {todoManager.todos.filter(t => t.done).length}/{todoManager.todos.length}
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <CoreInput
              value={todoManager.newTodo || ''}
              onChange={(e) => todoManager.setNewTodo(e.target.value)}
              placeholder={t('tasks.addTodo') || 'Добавить подзадачу'}
              className="flex-1"
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
              className="w-10 h-10 flex-shrink-0 bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200"
              style={{ borderRadius: '12px' }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            {todoManager.todos.map(todo => {
              const isHovered = todoManager.hoveredTodoId === todo.id
              return (
                <div 
                  key={todo.id} 
                  className="flex items-center gap-3 border border-gray-200 p-3 hover:border-gray-300 transition-all duration-200 cursor-pointer" 
                  style={{ 
                    borderRadius: '12px',
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: isHovered && !todo.done ? '#F2F7FA' : 'transparent'
                  }}
                  onMouseEnter={() => todoManager.setHoveredTodoId?.(todo.id)}
                  onMouseLeave={() => todoManager.setHoveredTodoId?.(null)}
                >
                  {/* Animated background fill */}
                  {todo.done && (
                    <div 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        backgroundColor: '#f3f4f6',
                        width: '100%',
                        zIndex: 0
                      }}
                    />
                  )}
                  
                  <div
                    onClick={() => todoManager.toggleTodo(todo.id)}
                    style={{ 
                      width: '24px', 
                      height: '24px',
                      borderRadius: '999px',
                      backgroundColor: todo.done ? '#000000' : '#ffffff',
                      border: '2px solid #000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'background-color 0.2s ease',
                      position: 'relative',
                      zIndex: 1
                    }}
                  >
                    {todo.done && (
                      <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="white" 
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20,6 9,17 4,12"></polyline>
                      </svg>
                    )}
                  </div>
                  <span
                    className="flex-1 bg-transparent text-sm"
                    style={{ 
                      textDecoration: todo.done ? 'line-through' : 'none', 
                      opacity: todo.done ? 0.6 : 1,
                      position: 'relative',
                      zIndex: 1
                    }}
                  >
                    {todo.text}
                  </span>
                  <button
                    onClick={() => todoManager.removeTodo(todo.id)}
                    className="p-1 hover:bg-gray-100 rounded-xl transition-colors"
                    style={{
                      position: 'relative',
                      zIndex: 1
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )
            })}
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
