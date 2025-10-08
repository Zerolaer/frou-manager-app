import React, { useEffect, useState } from 'react'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import ProjectDropdown from './ProjectDropdown'
import DateDropdown from './DateDropdown'
import { CoreInput, CoreTextarea } from './ui/CoreInput'
import { Plus, Trash2, Check } from 'lucide-react'

type Todo = { id: string; text: string; done: boolean }

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (title: string, description: string, priority: string, tag: string, todos: Todo[], projectId?: string, date?: Date) => Promise<void> | void
  dateLabel: string
  projects?: { id: string; name: string }[]
  activeProject?: string | null
  initialDate?: Date
}

export default function TaskAddModal({ open, onClose, onSubmit, dateLabel, projects = [], activeProject, initialDate }: Props){
  // Add safety check for React context
  if (!React.useState) {
    return null
  }
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low'|'normal'|'high'>('normal')
  const [tag, setTag] = useState('')
  const [todos, setTodos] = useState<Todo[]>([])
  const [todoText, setTodoText] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date())
  const { createStandardFooter } = useModalActions()

  // --- Project selection ---
  const initialProject = (activeProject && activeProject !== 'ALL') ? (activeProject as string) : ''
  const [projectId, setProjectId] = useState<string>(initialProject)

  useEffect(() => {
    if (open) {
      // When opening, sync selection from activeProject.
      setProjectId((activeProject && activeProject !== 'ALL') ? (activeProject as string) : '')
      // Initialize date
      if (initialDate) {
        setSelectedDate(initialDate)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeProject, initialDate])

  function addTodo(){
    const t = todoText.trim()
    if (!t) return
    setTodos(prev => [...prev, { id: String(Date.now()), text: t, done: false }])
    setTodoText('')
  }
  function toggleTodo(id: string){ setTodos(prev => prev.map(x => x.id === id ? { ...x, done: !x.done } : x)) }
  function removeTodo(id: string){ setTodos(prev => prev.filter(x => x.id !== id)) }

  async function save(){
    const t = title.trim()
    if (!t) return
    // Allow creating tasks without project (projectId can be empty string)
    
    console.log('📝 TaskAddModal save with projectId:', projectId, 'type:', typeof projectId)
    
    setLoading(true)
    try {
      // Pass projectId as-is (empty string means "Без проекта")
      await onSubmit(t, description, String(priority), tag.trim(), todos, projectId, selectedDate)
      setTitle(''); setDescription(''); setPriority('normal'); setTag(''); setTodos([]); setTodoText('')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <UnifiedModal 
      size="lg"
      open={open}
      onClose={onClose}
      title="Новая задача"
      subtitle={dateLabel}
      variant="side"
      footer={createStandardFooter(
        { 
          label: 'Добавить', 
          onClick: save, 
          loading, 
          disabled: !title.trim() 
        },
        { label: 'Отмена', onClick: onClose }
      )}
    >
      <div className="space-y-6">
        {/* Проект и Дата */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Проект *</label>
            <ProjectDropdown
              value={projectId}
              projects={projects}
              onChange={setProjectId}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Дата *</label>
            <DateDropdown
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(value) => setSelectedDate(new Date(value))}
            />
          </div>
        </div>

        {/* Название */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Название задачи *</label>
          <CoreInput
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название задачи"
          />
        </div>

        {/* Описание */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Описание</label>
          <CoreTextarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Подробности задачи"
            rows={4}
          />
        </div>

        {/* Приоритет - 3 кнопки */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Приоритет</label>
          <div className="flex gap-2">
            <button
              onClick={() => setPriority('low')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                priority === 'low'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Низкий
            </button>
            <button
              onClick={() => setPriority('normal')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                priority === 'normal'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Обычный
            </button>
            <button
              onClick={() => setPriority('high')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                priority === 'high'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Высокий
            </button>
          </div>
        </div>

        {/* Тег */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Тег</label>
          <CoreInput
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Напр. Work"
          />
        </div>

        {/* Подзадачи */}
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
            <CoreInput
              type="text"
              value={todoText}
              onChange={(e) => setTodoText(e.target.value)}
              placeholder="Добавить подзадачу"
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            />
            <button
              onClick={addTodo}
              disabled={!todoText.trim()}
              className="w-10 h-10 flex-shrink-0 bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200"
              style={{ borderRadius: '12px' }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {todos.length > 0 && (
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
          )}
        </div>
      </div>
    </UnifiedModal>
  )
}