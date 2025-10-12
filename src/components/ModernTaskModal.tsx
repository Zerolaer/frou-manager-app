import React, { useEffect, useState, useRef } from 'react'
import { Plus, Trash2, Calendar, Tag, Check } from 'lucide-react'
import ProjectDropdown from './ProjectDropdown'
import DateDropdown from './DateDropdown'
import CoreMenu from '@/components/ui/CoreMenu'
import { CoreInput, CoreTextarea } from '@/components/ui/CoreInput'
import { supabase } from '@/lib/supabaseClient'
import SideModal from '@/components/ui/SideModal'
import { useSafeTranslation } from '@/utils/safeTranslation'
import type { Todo, Project } from '@/types/shared'
import { logger } from '@/lib/monitoring'

// CSS animations for checkboxes
const checkboxAnimations = `
  @keyframes checkboxPress {
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
  
  @keyframes checkmarkBounce {
    0% {
      opacity: 0;
      transform: scale(0);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes todoBackgroundFill {
    0% {
      width: 0%;
    }
    100% {
      width: 100%;
    }
  }
`;

// Add styles to head if not present
if (typeof document !== 'undefined' && !document.getElementById('checkbox-animations')) {
  const style = document.createElement('style');
  style.id = 'checkbox-animations';
  style.textContent = checkboxAnimations;
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
  created_at?: string
  updated_at?: string
}

type Props = {
  open: boolean
  onClose: () => void
  task: Task | null
  onUpdated?: (task: Task | null) => void
}

export default function ModernTaskModal({ open, onClose, task, onUpdated }: Props) {
  const { t } = useSafeTranslation()
  // Add safety check for React context
  if (!React.useState) {
    return null
  }
  
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
  const [animatingTodos, setAnimatingTodos] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  // Load task data when modal opens (with key prop, component is recreated on task change)
  useEffect(() => {
    if (!open || !task) {
      setIsLoading(true)
      return
    }
    
    // Start with loading state
    setIsLoading(true)
    
    const timer = setTimeout(() => {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setPriority((task.priority as any) || 'normal')
      setTag(task.tag || '')
      setDate(task.date || '')
      setTodos(Array.isArray(task.todos) ? (task.todos as Todo[]) : [])
      setStatus((task as any)?.status || 'open')
      setProjectId(task.project_id || '')
      setNewTodo('')
      setIsLoading(false)
    }, 100)
    
    return () => clearTimeout(timer)
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
    logger.debug('⏱️ Title/description changed, scheduling save in 800ms')
    const timer = setTimeout(() => {
      save()
    }, 800) // 800ms debounce
    return () => clearTimeout(timer)
  }, [title, description, open, task, save])

  // Auto-save other fields with small delay
  useEffect(() => {
    if (!open || !task) return
    logger.debug('⏱️ Fields changed, scheduling save in 500ms')
    const timer = setTimeout(() => {
      save()
    }, 500)
    return () => clearTimeout(timer)
  }, [priority, tag, date, status, projectId, open, task, save])

  // Auto-save todos when they change
  useEffect(() => {
    if (!open || !task) return
    logger.debug('⏱️ Todos changed, scheduling save in 300ms')
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
    logger.debug('🚪 Closing modal, saving first...')
    await save()
    logger.debug('🚪 Saved, now closing')
    onClose()
  }

  async function save() {
    if (!task) {
      logger.debug('❌ Save skipped: no task')
      return
    }

    // Allow saving even with empty title for other fields
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
      date: date || null,
      todos,
      status,
      project_id: projectId || null,
    }

    logger.debug('📤 Updates payload:', updates)

    try {
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
      
      // Update local task with actual data from database
      if (data) {
        const updatedTask = { 
          ...task, 
          ...data,
          project_id: data.project_id || projectId || null
        }
        logger.debug('📢 Calling onUpdated with:', updatedTask)
        onUpdated?.(updatedTask)
      }
    } catch (error) {
      logger.error('❌ Error saving task:', error)
      alert(t('tasks.saveError') + ': ' + (error as any).message)
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
    // Trigger animation
    setAnimatingTodos(prev => new Set(prev).add(id))
    
    // Remove animation class after it completes
    setTimeout(() => {
      setAnimatingTodos(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 400)
    
    // Toggle todo state
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
      logger.error('Error deleting task:', error)
    }
  }

  const projectName = projects.find(p => p.id === projectId)?.name || t('tasks.noProject')
  const statusText = status === 'open' ? t('tasks.open') : t('tasks.closed')
  
  // Dynamic header - "Task \ Project \ Status" format
  const headerTitle = `${t('tasks.task')} \\ ${projectName} \\ ${statusText}`

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
              { value: 'duplicate', label: t('common.duplicate') },
              { value: 'delete', label: t('common.delete'), destructive: true },
            ]}
            onSelect={(value) => {
              if (value === 'duplicate') {
                // Minimal duplicate action: prefill title to indicate duplicate
                setTitle((prevTitle) => `${prevTitle} (${t('common.copy')})`)
              }
              if (value === 'delete') {
                deleteTask()
              }
            }}
          />
        </div>
      }
      footer={
        <button
          onClick={handleClose}
          className="inline-flex items-center justify-center px-4 font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors leading-none h-10"
          style={{ borderRadius: '12px', fontSize: '13px' }}
        >
          {t('actions.close')}
        </button>
      }
    >
      {isLoading ? (
        /* Loading State */
        <div className="flex h-full items-center justify-center">
          <div className="text-center space-y-4">
            <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">{t('tasks.loadingTask')}</p>
          </div>
        </div>
      ) : (
      <div className="flex h-full">
        {/* Left Column */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('tasks.taskTitle')}</label>
            <CoreInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('tasks.description')}</label>
            <CoreTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('tasks.taskDetails')}
              rows={6}
            />
          </div>

          {/* Subtasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">{t('tasks.subtasks')}</label>
              {todos.length > 0 && (
                <span className="text-sm text-gray-500">
                  {todos.filter(t => t.done).length}/{todos.length}
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <CoreInput
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder={t('tasks.addSubtask')}
                className="flex-1"
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
              {todos.map((todo) => {
                const isAnimating = animatingTodos.has(todo.id)
                return (
                <div 
                  key={todo.id} 
                  className="flex items-center gap-3 border border-gray-200 p-3 hover:border-gray-300 transition-colors" 
                  style={{ 
                    borderRadius: '12px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
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
                        animation: isAnimating ? 'todoBackgroundFill 0.25s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                        width: '100%',
                        zIndex: 0
                      }}
                    />
                  )}
                  
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
                      transition: 'background-color 0.2s ease',
                      animation: isAnimating ? 'checkboxPress 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
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
                        style={{
                          animation: isAnimating ? 'checkmarkBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
                        }}
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
                    style={{ 
                      textDecoration: todo.done ? 'line-through' : 'none', 
                      opacity: todo.done ? 0.6 : 1,
                      position: 'relative',
                      zIndex: 1
                    }}
                  />
                  <button
                    onClick={() => removeTodo(todo.id)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    style={{
                      position: 'relative',
                      zIndex: 1
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )})}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <aside className="w-[300px] bg-[#F2F7FA] p-0 flex flex-col flex-1 space-y-4 pt-6">
          {/* Project */}
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
            <div className="text-sm font-medium text-gray-700">{t('tasks.project')}</div>
            <ProjectDropdown
              value={projectId}
              projects={projects}
              onChange={setProjectId}
            />
          </section>

          {/* Status */}
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
            <div className="text-sm font-medium text-gray-700">{t('tasks.status')}</div>
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
                {t('tasks.open')}
              </button>
              <button
                onClick={() => setStatus('closed')}
                className={`relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors z-10 ${
                  status === 'closed'
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
              >
                {t('tasks.closed')}
              </button>
            </div>
          </section>

          {/* Priority */}
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
            <div className="text-sm font-medium text-gray-700">{t('tasks.priority')}</div>
            <div className="flex gap-2">
              <button
                onClick={() => setPriority('low')}
                className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  priority === 'low'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('tasks.lowPriority')}
              </button>
              <button
                onClick={() => setPriority('normal')}
                className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  priority === 'normal'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('tasks.normalPriority')}
              </button>
              <button
                onClick={() => setPriority('high')}
                className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  priority === 'high'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('tasks.highPriority')}
              </button>
            </div>
          </section>

          {/* Date */}
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
            <div className="text-sm font-medium text-gray-700">{t('tasks.date')}</div>
            <DateDropdown
              value={date}
              onChange={setDate}
            />
          </section>

          {/* Tag */}
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
            <div className="text-sm font-medium text-gray-700">{t('tasks.tag')}</div>
            <CoreInput
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder={t('tasks.tagExample')}
            />
          </section>

          {/* Task Info */}
          <div className="px-6 pb-6 text-center mt-auto">
            <div className="text-xs text-gray-600 mb-1">
              {t('tasks.taskCreated')}: {task?.created_at ? new Date(task.created_at).toLocaleDateString() : t('common.notSpecified')}
            </div>
            <div className="text-xs text-gray-600">
              {t('tasks.lastEdited')}: {task?.updated_at ? new Date(task.updated_at).toLocaleDateString() : t('common.notSpecified')}
            </div>
          </div>
        </aside>
      </div>
      )}
    </SideModal>
  )
}