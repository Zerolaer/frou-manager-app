import React, { useEffect, useState, useRef } from 'react'
import { Plus, Trash2, Calendar, Tag, Check } from 'lucide-react'
import ProjectDropdown from './ProjectDropdown'
import DateDropdown from './DateDropdown'
import CoreMenu from '@/components/ui/CoreMenu'
import { supabase } from '@/lib/supabaseClient'
import SideModal from '@/components/ui/SideModal'
import type { Todo, Project } from '@/types/shared'

// CSS анимация для прожатия
const pressStyle = `
  @keyframes press {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(0.85);
    }
    100% {
      transform: scale(1);
    }
  }
`;

// Добавляем стили в head если их еще нет
if (typeof document !== 'undefined' && !document.getElementById('press-animation')) {
  const style = document.createElement('style');
  style.id = 'press-animation';
  style.textContent = pressStyle;
  document.head.appendChild(style);
}

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
}

type Props = {
  open: boolean
  onClose: () => void
  task: Task | null
  onUpdated?: (task: Task | null) => void
}

export default function ModernTaskModal({ open, onClose, task, onUpdated }: Props) {
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Load task data when modal opens
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
    setNewTodo('') // Очищаем инпут подзадачи
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

  // Auto-save title and description with debounce
  useEffect(() => {
    if (!open || !task) return
    console.log('⏱️ Title/description changed, scheduling save in 800ms')
    const timer = setTimeout(() => {
      save()
    }, 800) // 800ms debounce
    return () => clearTimeout(timer)
  }, [title, description, open, task, save])

  // Auto-save other fields with small delay
  useEffect(() => {
    if (!open || !task) return
    console.log('⏱️ Fields changed, scheduling save in 500ms')
    const timer = setTimeout(() => {
      save()
    }, 500)
    return () => clearTimeout(timer)
  }, [priority, tag, date, status, projectId, open, task, save])

  // Auto-save todos when they change
  useEffect(() => {
    if (!open || !task) return
    console.log('⏱️ Todos changed, scheduling save in 300ms')
    const timer = setTimeout(() => {
      save()
    }, 300)
    return () => clearTimeout(timer)
  }, [todos, open, task, save])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  // Handler for closing with save
  const handleClose = async () => {
    console.log('🚪 Closing modal, saving first...')
    await save()
    console.log('🚪 Saved, now closing')
    onClose()
  }

  async function save() {
    if (!task) {
      console.log('❌ Save skipped: no task')
      return
    }

    // Allow saving even with empty title for other fields
    const finalTitle = title.trim() || task.title || 'Untitled Task'

    console.log('💾 Saving task:', { 
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
      priority: priority || '',
      tag: tag.trim() || '',
      date: date || null,
      todos,
      status,
      project_id: projectId || null,
    }

    console.log('📤 Updates payload:', updates)

    try {
      const { data, error } = await supabase
        .from('tasks_items')
        .update(updates)
        .eq('id', task.id)
        .select('id,project_id,title,description,date,position,priority,tag,todos,status')
        .single()

      if (error) {
        console.error('❌ Supabase error:', error)
        throw error
      }

      console.log('✅ Task saved successfully:', data)
      
      // Update local task with actual data from database
      if (data) {
        const updatedTask = { 
          ...task, 
          ...data,
          project_id: data.project_id || projectId || null
        }
        console.log('📢 Calling onUpdated with:', updatedTask)
        onUpdated?.(updatedTask)
      }
    } catch (error) {
      console.error('❌ Error saving task:', error)
      alert('Ошибка при сохранении задачи: ' + (error as any).message)
    }
  }

  function addTodo() {
    const text = newTodo.trim()
    if (!text) return
    const newTodoItem: Todo = {
      id: String(Date.now()),
      text,
      done: false
    }
    setTodos(prev => [...prev, newTodoItem])
    setNewTodo('')
  }

  function toggleTodo(id: string) {
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, done: !t.done } : t
    ))
  }

  function removeTodo(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  async function deleteTask() {
    if (!task) return
    try {
      const { error } = await supabase
        .from('tasks_items')
        .delete()
        .eq('id', task.id)

      if (error) throw error
      onUpdated?.(null)
      onClose()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const projectName = projects.find(p => p.id === projectId)?.name || 'Без проекта'
  const statusText = status === 'open' ? 'Открыта' : 'Закрыта'
  
  // Dynamic header - "Задача \ Проект \ Статус" format
  const headerTitle = `Задача \\ ${projectName} \\ ${statusText}`

  return (
    <SideModal
      open={open}
      onClose={handleClose}
      showCloseButton={false}
      noPadding={true}
      title={headerTitle}
      rightContent={
        <div ref={menuRef}>
          <CoreMenu
            options={[
              { value: 'duplicate', label: 'Дублировать' },
              { value: 'delete', label: 'Удалить', destructive: true },
            ]}
            onSelect={(value) => {
              if (value === 'duplicate') {
                // Minimal duplicate action: prefill title to indicate duplicate
                setTitle((t) => `${t} (копия)`)
              }
              if (value === 'delete') {
                deleteTask()
              }
            }}
          />
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Закрыть
          </button>
        </div>
      }
    >
      <div className="flex h-full">
        {/* Left Column */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Название задачи</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-all outline-none bg-white"
              style={{ borderRadius: '12px' }}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробности задачи"
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-all outline-none resize-none bg-white"
              style={{ borderRadius: '12px' }}
            />
          </div>

          {/* Subtasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Подзадачи</label>
              {todos.length > 0 && (
                <span className="text-sm text-gray-500">
                  {todos.filter(t => t.done).length}/{todos.length}
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="Добавить подзадачу"
                className="flex-1 h-10 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-all outline-none bg-white"
                onKeyPress={(e) => e.key === 'Enter' && addTodo()}
              />
              <button
                onClick={addTodo}
                disabled={!newTodo.trim()}
                className="w-10 h-10 flex-shrink-0 bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200"
                style={{ borderRadius: '12px' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              {todos.map((todo) => (
                <div key={todo.id} className="flex items-center gap-3 border border-gray-200 p-3 hover:border-gray-300 transition-colors" style={{ borderRadius: '12px' }}>
                  <div
                    onClick={() => toggleTodo(todo.id)}
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
                      transition: 'background-color 0.2s ease'
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
                  <input
                    type="text"
                    value={todo.text}
                    onChange={(e) => setTodos(prev => prev.map(t => 
                      t.id === todo.id ? { ...t, text: e.target.value } : t
                    ))}
                    className="flex-1 bg-transparent border-none outline-none text-sm"
                    style={{ textDecoration: todo.done ? 'line-through' : 'none', opacity: todo.done ? 0.6 : 1 }}
                  />
                  <button
                    onClick={() => removeTodo(todo.id)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <aside className="w-[300px] bg-[#F2F7FA] p-0 flex flex-col flex-1 space-y-4 pt-6">
          {/* Project */}
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
            <div className="text-sm font-medium text-gray-700">Проект</div>
            <ProjectDropdown
              value={projectId}
              projects={projects}
              onChange={setProjectId}
            />
          </section>

          {/* Status */}
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
            <div className="text-sm font-medium text-gray-700">Статус</div>
            <div className="relative rounded-xl h-10 flex p-1" style={{ backgroundColor: '#F2F7FA' }}>
              <div 
                className={`absolute top-1 bottom-1 w-1/2 bg-black rounded-lg transition-transform duration-200 ${
                  status === 'open' ? 'translate-x-0' : 'translate-x-full'
                }`}
              />
              <button
                onClick={() => setStatus('open')}
                className={`relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors z-10 ${
                  status === 'open'
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
              >
                Открыта
              </button>
              <button
                onClick={() => setStatus('closed')}
                className={`relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors z-10 ${
                  status === 'closed'
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
              >
                Закрыта
              </button>
            </div>
          </section>

          {/* Priority */}
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
            <div className="text-sm font-medium text-gray-700">Приоритет</div>
            <div className="flex gap-2">
              <button
                onClick={() => setPriority('low')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  priority === 'low'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Низкий
              </button>
              <button
                onClick={() => setPriority('normal')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  priority === 'normal'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Обычный
              </button>
              <button
                onClick={() => setPriority('high')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  priority === 'high'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Высокий
              </button>
            </div>
          </section>

          {/* Date */}
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
            <div className="text-sm font-medium text-gray-700">Дата</div>
            <DateDropdown
              value={date}
              onChange={setDate}
            />
          </section>

          {/* Tag */}
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
            <div className="text-sm font-medium text-gray-700">Тег</div>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Напр. Work"
              className="w-full h-10 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-all outline-none bg-white"
            />
          </section>

          {/* Task Info */}
          <div className="px-6 pb-6 text-center mt-auto">
            <div className="text-xs text-gray-600 mb-1">
              Задача создана: {task?.created_at ? new Date(task.created_at).toLocaleDateString('ru-RU') : 'Не указано'}
            </div>
            <div className="text-xs text-gray-600">
              Последнее редактирование: {task?.updated_at ? new Date(task.updated_at).toLocaleDateString('ru-RU') : 'Не указано'}
            </div>
          </div>
        </aside>
      </div>
    </SideModal>
  )
}