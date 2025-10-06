import React, { useEffect, useState } from 'react'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { ModalField, ModalInput, ModalTextarea, ModalSelect, ModalGrid, ModalContent } from '@/components/ui/ModalForm'
import CheckFinance from '@/components/CheckFinance'
import { X, Plus } from 'lucide-react'

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
    if (!projectId) return // required in 'ALL' and generally required to create
    
    setLoading(true)
    try {
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
      footer={createStandardFooter(
        { 
          label: 'Добавить', 
          onClick: save, 
          loading, 
          disabled: !projectId || !title.trim() 
        },
        { label: 'Отмена', onClick: onClose }
      )}
    >
      <ModalContent>
        <ModalGrid cols={2}>
          <ModalField label="Проект" required>
            <ModalSelect
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
            >
              <option value="">{activeProject === 'ALL' ? 'Выберите проект' : 'Текущий проект выбран'}</option>
              {(projects || []).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </ModalSelect>
          </ModalField>

          <ModalField label="Дата" required>
            <ModalInput
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={e => setSelectedDate(new Date(e.target.value))}
            />
          </ModalField>
        </ModalGrid>

        <ModalField label="Название задачи" required>
          <ModalInput
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Название задачи"
          />
        </ModalField>

        <ModalField label="Описание">
          <ModalTextarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Подробности задачи"
            rows={4}
          />
        </ModalField>

        <ModalGrid cols={2}>
          <ModalField label="Приоритет">
            <ModalSelect value={priority} onChange={e => setPriority(e.target.value as any)}>
              <option value="low">Низкий</option>
              <option value="normal">Обычный</option>
              <option value="high">Высокий</option>
            </ModalSelect>
          </ModalField>
          
          <ModalField label="Тег">
            <ModalInput 
              value={tag} 
              onChange={e => setTag(e.target.value)} 
              placeholder="Напр. Work" 
            />
          </ModalField>
        </ModalGrid>

        <ModalField label="Чек-лист">
          <div className="space-y-2">
            <div className="flex gap-2">
              <ModalInput 
                value={todoText} 
                onChange={e => setTodoText(e.target.value)} 
                placeholder="Добавить пункт" 
              />
              <button 
                className="px-6 py-3 bg-gradient-to-br from-gray-800 to-gray-600 text-white rounded-xl hover:from-gray-900 hover:to-gray-700 disabled:opacity-50 flex items-center gap-2 transition-all duration-200 shadow-md" 
                onClick={addTodo} 
                disabled={!todoText.trim()}
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>
            
            {todos.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {todos.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <CheckFinance checked={item.done} onToggle={() => toggleTodo(item.id)} />
                    <span className={`text-sm flex-1 ${item.done ? 'line-through text-gray-400' : ''}`}>
                      {item.text}
                    </span>
                    <button 
                      className="text-gray-400 hover:text-gray-600 p-1" 
                      onClick={() => removeTodo(item.id)} 
                      title="Удалить"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ModalField>
      </ModalContent>
    </UnifiedModal>
  )
}