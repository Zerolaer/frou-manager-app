import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Calendar, Tag, Check } from 'lucide-react'
import { ProjectDropdown, DateDropdown, PriorityDropdown } from '@/components/ui/UnifiedDropdown'
import { CoreInput, CoreTextarea } from '@/components/ui/CoreInput'
import MobileModal from '@/components/ui/MobileModal'
import { ModalButton } from '@/components/ui/ModalSystem'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/lib/monitoring'
import type { Todo, Project } from '@/types/shared'

type Task = {
  id: string
  project_id?: string | null
  title: string
  description?: string | null
  priority?: string | null
  tag?: string | null
  date?: string | null
  todos?: Todo[]
  status?: string
  created_at?: string
  updated_at?: string
}

type Props = {
  open: boolean
  onClose: () => void
  task: Task | null
  onUpdated?: (task: Task | null, isSave?: boolean) => void
  onUpdateRecurrence?: (taskId: string, settings: any) => Promise<void>
}

export default function MobileTaskModal({ open, onClose, task, onUpdated, onUpdateRecurrence }: Props) {
  const { t } = useSafeTranslation()
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('')
  const [tag, setTag] = useState('')
  const [date, setDate] = useState('')
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [status, setStatus] = useState<'open' | 'closed'>('open')
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Initialize form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setPriority(task.priority || 'normal')
      setTag(task.tag || '')
      setDate(task.date || '')
      setTodos(task.todos || [])
      setStatus((task.status === 'closed') ? 'closed' : 'open')
      setProjectId(task.project_id || '')
    }
  }, [task])

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      const { data, error } = await supabase
        .from('tasks_projects')
        .select('id, name')
        .order('name')
      
      if (!error && data) {
        setProjects(data)
      }
    }
    loadProjects()
  }, [])

  const save = async (isAutoSave = false) => {
    if (!task) return

    setIsSaving(true)
    try {
      const finalTitle = title.trim() || task.title || 'Untitled Task'

      logger.debug('💾 Saving task:', { 
        id: task.id, 
        title: finalTitle, 
        description: description.trim(), 
        priority, 
        tag: tag.trim(), 
        date, 
        projectId,
        todos: todos.length 
      })

      const updates = {
        title: finalTitle,
        description: description.trim() || '',
        priority: priority || 'normal',
        tag: tag.trim() || '',
        date: date || new Date().toISOString().split('T')[0],
        todos,
        status,
        project_id: projectId || null,
      }

      logger.debug('📤 Updates payload:', updates)

      const { data, error } = await supabase
        .from('tasks_items')
        .update(updates)
        .eq('id', task.id)
        .select('id,project_id,title,description,date,position,priority,tag,todos,status')
        .single()

      if (error) {
        logger.error('❌ Supabase error:', error)
        throw error
      }

      logger.debug('✅ Task saved successfully:', data)
      
      if (data) {
        const updatedTask = { 
          ...task, 
          ...data,
          project_id: data.project_id || projectId || null
        }
        
        if (onUpdated) {
          onUpdated(updatedTask, isAutoSave)
        }
      }
    } catch (error) {
      logger.error('❌ Error saving task:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Auto-save title and description with debounce
  useEffect(() => {
    if (!open || !task) return
    logger.debug('⏱️ Title/description changed, scheduling save in 800ms')
    const timer = setTimeout(() => {
      save(true) // true = auto-save
    }, 800) // 800ms debounce
    return () => clearTimeout(timer)
  }, [title, description, open, task])

  // Auto-save other fields with small delay
  useEffect(() => {
    if (!open || !task) return
    const timer = setTimeout(() => {
      save(true) // true = auto-save
    }, 300) // 300ms debounce
    return () => clearTimeout(timer)
  }, [priority, tag, date, projectId, status, open, task])

  const addTodo = () => {
    if (!newTodo.trim()) return
    const todo: Todo = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      done: false
    }
    setTodos([...todos, todo])
    setNewTodo('')
  }

  const toggleTodo = (todoId: string) => {
    setTodos(todos.map(todo => 
      todo.id === todoId ? { ...todo, done: !todo.done } : todo
    ))
  }

  const removeTodo = (todoId: string) => {
    setTodos(todos.filter(todo => todo.id !== todoId))
  }

  const updateTodo = (todoId: string, text: string) => {
    setTodos(todos.map(todo => 
      todo.id === todoId ? { ...todo, text } : todo
    ))
  }

  const handleSave = async () => {
    await save(false) // false = manual save
    onClose()
  }

  const handleDelete = async () => {
    if (!task || !window.confirm(t('tasks.deleteConfirm'))) return
    
    try {
      const { error } = await supabase
        .from('tasks_items')
        .delete()
        .eq('id', task.id)

      if (error) throw error

      if (onUpdated) {
        onUpdated(null) // null means deleted
      }
      onClose()
    } catch (error) {
      logger.error('❌ Error deleting task:', error)
    }
  }

  if (!task) return null

  return (
    <MobileModal
      open={open}
      onClose={onClose}
      title={t('tasks.editTask')}
      footer={
        <div className="flex gap-3 p-4">
          <ModalButton
            variant="danger"
            onClick={handleDelete}
            className="flex-1"
          >
            {t('actions.delete')}
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleSave}
            loading={isSaving}
            className="flex-1"
          >
            {t('actions.save')}
          </ModalButton>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        {/* Заголовок */}
        <div>
          <CoreInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('tasks.taskTitle')}
            className="text-base font-medium"
          />
        </div>

        {/* Описание */}
        <div>
          <CoreTextarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
              value={projectId}
              onChange={(value) => setProjectId(value as string)}
              projects={projects}
              placeholder={t('tasks.selectProject')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.date')}
            </label>
            <DateDropdown
              value={date}
              onChange={(value) => setDate(value as string)}
              placeholder={t('tasks.selectDate')}
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
              value={priority}
              onChange={(value) => setPriority(value as string)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.tag')}
            </label>
            <CoreInput
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder={t('tasks.tagPlaceholder')}
            />
          </div>
        </div>

        {/* Статус */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('tasks.status')}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'open' | 'closed')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="open">{t('tasks.open')}</option>
            <option value="closed">{t('tasks.closed')}</option>
          </select>
        </div>

        {/* Подзадачи */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              {t('tasks.subtasks')}
            </label>
          </div>
          
          {/* Добавить подзадачу */}
          <div className="flex gap-2 mb-3">
            <CoreInput
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder={t('tasks.addSubtask')}
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            />
            <ModalButton
              variant="secondary"
              onClick={addTodo}
              disabled={!newTodo.trim()}
            >
              <Plus className="w-4 h-4" />
            </ModalButton>
          </div>
          
          {/* Список подзадач */}
          <div className="space-y-2">
            {todos.map((todo) => (
              <div key={todo.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <button
                  type="button"
                  onClick={() => toggleTodo(todo.id)}
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
                  onChange={(e) => updateTodo(todo.id, e.target.value)}
                  className={`flex-1 bg-transparent border-none outline-none text-sm ${
                    todo.done ? 'line-through text-gray-500' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => removeTodo(todo.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          
          {todos.length === 0 && (
            <div className="text-center py-6 text-gray-500 text-sm">
              {t('tasks.noSubtasks')}
            </div>
          )}
        </div>
      </div>
    </MobileModal>
  )
}
