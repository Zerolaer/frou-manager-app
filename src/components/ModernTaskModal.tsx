import React, { useEffect, useState, useRef } from 'react'
import { Plus, Trash2, Calendar, Tag, Paperclip, MoreVertical } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useModalActions } from '@/components/ui/ModalSystem'
import Modal from '@/components/ui/Modal'
import type { Todo, Project } from '@/types/shared'

type Task = {
  id: string
  project_id?: string | null
  title: string
  description?: string
  date?: string | null
  position?: number | null
  priority?: '' | 'low' | 'medium' | 'high'
  tag?: string | null
  todos?: Todo[]
  status?: 'open' | 'closed'
}

type Props = {
  open: boolean
  onClose: () => void
  task: Task | null
  onUpdated: (t: Task) => void
}

export default function ModernTaskModal({ open, onClose, task, onUpdated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'' | 'low' | 'medium' | 'high'>('')
  const [tag, setTag] = useState<string>('')
  const [date, setDate] = useState<string>('')
  const [todos, setTodos] = useState<Todo[]>([])
  const [status, setStatus] = useState<'open' | 'closed'>('open')
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [newTodo, setNewTodo] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const { createDangerFooter } = useModalActions()

  // Close menu on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Load task data
  useEffect(() => {
    if (!open || !task) return
    setTitle(task.title || '')
    setDescription(task.description || '')
    setPriority((task.priority as any) || '')
    setTag(task.tag || '')
    setDate(task.date || '')
    setTodos(Array.isArray(task.todos) ? (task.todos as Todo[]) : [])
    setStatus((task as any)?.status || 'open')
    setProjectId(task.project_id || '')
  }, [open, task])

  // Load projects
  useEffect(() => {
    if (!open) return
    ;(async () => {
      const { data } = await supabase
        .from('tasks_projects')
        .select('id,name')
        .order('created_at', { ascending: true })
      setProjects((data as Project[]) || [])
    })()
  }, [open])

  const addTodo = () => {
    if (!newTodo.trim()) return
    const id = Math.random().toString(36).slice(2)
    setTodos(prev => [...prev, { id, text: newTodo.trim(), done: false }])
    setNewTodo('')
  }

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  const removeTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const save = async () => {
    if (!task) return
    setSaving(true)
    try {
      const payload = {
        title,
        description,
        priority: priority || null,
        tag: tag || null,
        date: date || null,
        todos,
        status,
        project_id: projectId || null,
      }
      const { data, error } = await supabase
        .from('tasks_items')
        .update(payload)
        .eq('id', task.id)
        .select('id,project_id,title,description,date,position,priority,tag,todos,status')
        .single()
      
      if (!error && data) {
        onUpdated(data as unknown as Task)
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  const deleteTask = async () => {
    if (!task) return
    try {
      await supabase.from('tasks_items').delete().eq('id', task.id)
      onClose()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const doneCount = todos.filter(t => t.done).length
  const totalCount = todos.length

  // Get project name for header
  const currentProject = projects.find(p => p.id === projectId)
  const projectName = currentProject?.name || 'Без проекта'
  const statusText = status === 'open' ? 'Открыта' : 'Закрыта'
  
  // Dynamic header - "Задача \ Проект \ Статус" format
  const headerTitle = `Задача \\ ${projectName} \\ ${statusText}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={headerTitle}
      size="xl"
      headerRight={
        <div className="relative" ref={menuRef}>
          <button
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Меню"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 min-w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-xl z-10">
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                onClick={() => {
                  // Duplicate logic here
                  setMenuOpen(false)
                }}
              >
                Дублировать
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg"
                onClick={() => {
                  deleteTask()
                  setMenuOpen(false)
                }}
              >
                Удалить
              </button>
            </div>
          )}
        </div>
      }
      footer={createDangerFooter(
        { 
          label: 'Удалить', 
          onClick: deleteTask
        },
        { 
          label: saving ? 'Сохранение...' : 'Сохранить', 
          onClick: save,
          loading: saving,
          disabled: !title.trim()
        },
        { 
          label: 'Закрыть', 
          onClick: onClose
        }
      )}
      bodyClassName="p-0"
    >

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Column - Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Title and Description Block */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                {/* Title */}
                <div className="mb-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={save}
                  className="w-full text-lg font-semibold text-gray-900 bg-transparent border-none outline-none placeholder-gray-400"
                  placeholder="Название задачи"
                />
                </div>

                {/* Description */}
                <div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={save}
                  className="w-full min-h-[100px] text-gray-700 bg-transparent border-none outline-none resize-none placeholder-gray-400"
                  placeholder="Добавьте описание задачи..."
                />
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Подзадачи</h3>
                  <span className="text-sm text-gray-500">{doneCount}/{totalCount}</span>
                </div>
                
                <div className="space-y-3">
                  {todos.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <button
                        onClick={() => toggleTodo(todo.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          todo.done 
                            ? 'bg-blue-500 border-blue-500 text-white' 
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {todo.done && <div className="w-2 h-2 bg-white rounded-full" />}
                      </button>
                      <input
                        type="text"
                        value={todo.text}
                        onChange={(e) => setTodos(prev => prev.map(t => 
                          t.id === todo.id ? { ...t, text: e.target.value } : t
                        ))}
                        className={`flex-1 bg-transparent border-none outline-none ${
                          todo.done ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}
                      />
                      <button
                        onClick={() => removeTodo(todo.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTodo}
                      onChange={(e) => setNewTodo(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Добавить подзадачу"
                    />
                    <button
                      onClick={addTodo}
                      disabled={!newTodo.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Добавить
                    </button>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Вложения</h3>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Paperclip className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500">Нет вложений</span>
                  <button className="ml-auto text-sm text-blue-500 hover:text-blue-600">
                    Добавить
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto flex-shrink-0">
            {/* Project */}
            <div className="p-6 pb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Проект</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Без проекта</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Status */}
            <div className="p-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
              <div className="flex rounded-lg border border-gray-200 bg-white p-1">
                <button
                  onClick={() => setStatus('open')}
                  className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                    status === 'open' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Открыта
                </button>
                <button
                  onClick={() => setStatus('closed')}
                  className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                    status === 'closed' 
                      ? 'bg-green-500 text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Закрыта
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Due Date */}
            <div className="p-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Срок выполнения</label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={date || ''}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Priority */}
            <div className="p-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Приоритет</label>
              <div className="flex gap-1">
                {[
                  { value: 'low', label: 'Низкий', color: 'bg-green-100 text-green-700 border-green-200' },
                  { value: 'medium', label: 'Средний', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                  { value: 'high', label: 'Высокий', color: 'bg-red-100 text-red-700 border-red-200' },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value as any)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      priority === p.value 
                        ? p.color 
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Tags */}
            <div className="p-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Теги</label>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={tag || ''}
                  onChange={(e) => setTag(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Добавить тег"
                />
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Timestamps */}
            <div className="p-6 pt-4">
              <div className="space-y-2 text-sm text-gray-500">
                <div>Создано: {new Date().toLocaleDateString()}</div>
                <div>Обновлено: {new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
    </Modal>
  )
}
