import Modal from '@/components/Modal'
import CheckFinance from '@/components/CheckFinance'
import { useEffect, useState } from 'react'

type Todo = { id: string; text: string; done: boolean }

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (title: string, description: string, priority: string, tag: string, todos: Todo[], projectId?: string) => Promise<void> | void
  dateLabel: string
  projects?: { id: string; name: string }[]
  activeProject?: string | null
}

export default function TaskAddModal({ open, onClose, onSubmit, dateLabel, projects = [], activeProject }: Props){
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low'|'normal'|'high'>('normal')
  const [tag, setTag] = useState('')
  const [todos, setTodos] = useState<Todo[]>([])
  const [todoText, setTodoText] = useState('')

  // --- Project selection ---
  const initialProject = (activeProject && activeProject !== 'ALL') ? (activeProject as string) : ''
  const [projectId, setProjectId] = useState<string>(initialProject)

  useEffect(() => {
    if (open) {
      // When opening, sync selection from activeProject.
      setProjectId((activeProject && activeProject !== 'ALL') ? (activeProject as string) : '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeProject])

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
    await onSubmit(t, description, String(priority), tag.trim(), todos, projectId)
    setTitle(''); setDescription(''); setPriority('normal'); setTag(''); setTodos([]); setTodoText('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={'Новая задача'}
      subTitle={dateLabel}
      footer={
        <div className="flex items-center gap-2">
          <button
            className="h-9 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className="h-9 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            onClick={save}
            disabled={!projectId || !title.trim()}
          >
            Добавить
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-600 block mb-1">Проект</label>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full"
          >
            <option value="">{activeProject === 'ALL' ? 'Выберите проект' : 'Текущий проект выбран'}</option>
            {(projects || []).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-full"
          placeholder="Название задачи"
        />

        <div>
          <label className="text-sm text-gray-600 block mb-1">Описание</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full min-h-[100px]"
            placeholder="Подробности задачи"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Приоритет</label>
            <select value={priority} onChange={e => setPriority(e.target.value as any)} className="border rounded-lg px-3 py-2 text-sm w-full">
              <option value="low">Низкий</option>
              <option value="normal">Обычный</option>
              <option value="high">Высокий</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Тег</label>
            <input value={tag} onChange={e=>setTag(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Напр. Work" />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Чек‑лист</label>
          <div className="flex gap-2">
            <input value={todoText} onChange={e=>setTodoText(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Добавить пункт" />
            <button className="btn" onClick={addTodo} disabled={!todoText.trim()}>Добавить</button>
          </div>
          <ul className="mt-2 space-y-1">
            {todos.map(item => (
              <li key={item.id} className="flex items-center gap-2">
                <CheckFinance checked={item.done} onToggle={()=>toggleTodo(item.id)} />
                <span className={'text-sm ' + (item.done ? 'line-through text-gray-400' : '')}>{item.text}</span>
                <button className="text-gray-400 hover:text-gray-600 ml-auto" onClick={()=>removeTodo(item.id)} title="Удалить">×</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}
