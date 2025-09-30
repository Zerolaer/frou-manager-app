
// v1.0.6: square menu button, full-width status switcher, custom checkbox for subtasks
import { useEffect, useRef, useState, useCallback } from 'react'
import { useModalActions } from '@/components/ui/ModalSystem'
import Modal from '@/components/ui/Modal'
import CheckFinance from '@/components/CheckFinance'
import { supabase } from '@/lib/supabaseClient'
import { Plus, Trash2, MoreVertical } from 'lucide-react'

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

export default function TaskViewModal({ open, onClose, task, onUpdated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'' | 'low' | 'medium' | 'high'>('')
  const [tag, setTag] = useState<string>('')
  const [date, setDate] = useState<string>('')
  const [todos, setTodos] = useState<Todo[]>([])
  const [status, setStatus] = useState<'open' | 'closed'>('open')
  const [menuOpen, setMenuOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string>('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { createDangerFooter } = useModalActions()

  // Close header menu on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Load task into local state
  useEffect(() => {
    if (!open) return
    console.log('TaskViewModal: Loading task data', task)
    setTitle(task?.title || '')
    setDescription(task?.description || '')
    setPriority((task?.priority as any) || '')
    setTag(task?.tag || '')
    setDate(task?.date || '')
    setTodos(Array.isArray(task?.todos) ? (task!.todos as Todo[]) : [])
    setStatus((task as any)?.status || 'open')
    setProjectId(task?.project_id || '')
  }, [open, task])

  // Load projects for the Project select (use same columns as Tasks.tsx)
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('tasks_projects')
        .select('id,name')
        .order('created_at', { ascending: true })
      setProjects((data as Project[]) || [])
    })()
  }, []) // Load only once on component mount

  function addTodo() {
    const id = Math.random().toString(36).slice(2)
    setTodos((prev) => [...prev, { id, text: 'Новая подзадача', done: false }])
  }
  function toggleTodo(id: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }
  function removeTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  async function setStatusRemote(next: 'open' | 'closed') {
    if (!task) return
    setStatus(next)
    const { data, error } = await supabase.from('tasks_items').update({ status: next }).eq('id', task.id)
      .select('id,project_id,title,description,date,position,priority,tag,todos,status')
      .single()
    if (!error && data) {
      onUpdated(data as unknown as Task)
    }
  }

  async function moveToProject(nextProjectId: string | null) {
    if (!task) return
    setProjectId(nextProjectId || '')
    const { data, error } = await supabase.from('tasks_items').update({ project_id: nextProjectId }).eq('id', task.id)
      .select('id,project_id,title,description,date,position,priority,tag,todos,status')
      .single()
    if (!error && data) {
      onUpdated(data as unknown as Task)
    }
  }

  async function duplicateTask() {
    if (!task) return
    const payload: any = {
      project_id: projectId || null,
      title,
      description,
      date: date || null,
      position: (task.position ?? 0) + 1,
      priority: priority || null,
      tag: tag || null,
      todos,
      status,
    }
    const { data, error } = await supabase.from('tasks_items').insert(payload).select('id').single()
    if (!error && data?.id) {
      const { data: d2 } = await supabase
        .from('tasks_items')
        .select('id,project_id,title,description,date,position,priority,tag,todos,status')
        .eq('id', data.id)
        .single()
      if (d2) onUpdated(d2 as unknown as Task)
    }
  }

  async function deleteTask() {
    if (!task) return
    setDeleteLoading(true)
    try {
      await supabase.from('tasks_items').delete().eq('id', task.id)
      onClose()
    } finally {
      setDeleteLoading(false)
    }
  }

  const save = useCallback(async (): Promise<boolean> => {
    if (!task) return false
    setSaving(true)
    const payload: any = {
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
    setSaving(false)
    if (!error && data) {
      onUpdated(data as unknown as Task)
      return true
    }
    return false
  }, [task, title, description, priority, tag, date, todos, status, projectId, onUpdated])

  // Manual save only - no autosave
  const handleSave = async () => {
    const ok = await save()
    if (ok) {
      onClose()
    }
  }

  const doneCount = todos.filter((t) => t.done).length
  const totalCount = todos.length

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Задача"
      subTitle={task?.date ? `Создана: ${new Date(task.date).toLocaleDateString()}` : undefined}
      size="xl"
      headerRight={
        <div className="relative" ref={menuRef}>
          <button
            className="h-8 w-8 grid place-items-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Меню"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 min-w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-xl z-10">
              <div className="dd-item" onClick={duplicateTask}>Дублировать</div>
              <div className="dd-item text-red-600" onClick={deleteTask}>Удалить</div>
            </div>
          )}
        </div>
      }
      footer={createDangerFooter(
        { 
          label: 'Удалить', 
          onClick: deleteTask,
          loading: deleteLoading
        },
        { 
          label: 'Сохранить', 
          onClick: handleSave,
          loading: saving
        },
        { 
          label: 'Закрыть', 
          onClick: onClose
        }
      )}
    >
      {/* BODY: Split/Inspector */}
      <div className="grid grid-cols-[1fr_280px] gap-6 max-md:grid-cols-1">
        {/* LEFT */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Название</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base font-semibold"
              placeholder="Название задачи"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[140px] rounded-lg border border-gray-300 p-3"
              placeholder="Добавьте детали задачи…"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Подзадачи</div>
              <div className="text-xs text-gray-500">{doneCount} / {totalCount}</div>
            </div>
            <ul className="mt-2 space-y-2">
              {todos.map((item) => (
                <li key={item.id} className="flex items-center gap-2 rounded-xl border border-gray-200 p-2">
                  <CheckFinance checked={item.done} onToggle={()=>toggleTodo(item.id)} />
                  <input
                    value={item.text}
                    onChange={(e) =>
                      setTodos((prev) => prev.map((t) => (t.id === item.id ? { ...t, text: e.target.value } : t)))
                    }
                    className="flex-1 bg-transparent outline-none"
                  />
                  <button className="h-8 rounded-lg border border-gray-200 px-2 text-sm hover:bg-gray-50 flex items-center gap-1" onClick={() => removeTodo(item.id)}>
                    <Trash2 className="w-4 h-4" />
                    Удалить
                  </button>
                </li>
              ))}
            </ul>
            <button className="h-9 px-4 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 mt-3 flex items-center gap-2" onClick={addTodo}>
              <Plus className="w-4 h-4" />
              Подзадача
            </button>
          </div>
        </div>

        {/* RIGHT inspector */}
        <aside className="space-y-4">
          <section className="space-y-2 rounded-xl border border-gray-200 p-3">
            <div className="text-sm font-medium text-gray-700">Проект</div>
            <select
              value={projectId}
              onChange={(e) => moveToProject(e.target.value || null)}
              className="h-9 w-full rounded-xl border border-gray-200 px-3 bg-white"
            >
              <option value="">Без проекта</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || 'Без названия'}
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-2 rounded-xl border border-gray-200 p-3">
            <div className="text-sm font-medium text-gray-700">Статус</div>
            <StatusSwitcher value={status} onChange={setStatusRemote} fullWidth />
          </section>

          <section className="space-y-2 rounded-xl border border-gray-200 p-3">
            <div className="text-sm font-medium text-gray-700">Приоритет</div>
            <PriorityChipsFullWidth value={priority} onChange={setPriority} />
          </section>

          <section className="space-y-2 rounded-xl border border-gray-200 p-3">
            <div className="text-sm font-medium text-gray-700">Тег</div>
            <input
              value={tag || ''}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Введите тег"
              className="h-9 w-full rounded-xl border border-gray-200 px-3"
            />
          </section>

          <section className="space-y-2 rounded-xl border border-gray-200 p-3">
            <div className="text-sm font-medium text-gray-700">Дата</div>
            <DateQuick value={date || ''} onChange={setDate} />
          </section>

        </aside>
      </div>
    </Modal>
  )
}

/* --- helpers --- */

function StatusSwitcher({
  value,
  onChange,
  fullWidth,
}: {
  value: 'open' | 'closed'
  onChange: (next: 'open' | 'closed') => void
  fullWidth?: boolean
}) {
  return (
    <div className={(fullWidth ? 'w-full ' : '') + 'flex rounded-full border border-gray-200 bg-gray-100 p-1 text-xs'}>
      <button
        className={'flex-1 rounded-full px-3 py-1 text-center ' + (value === 'open' ? 'bg-white shadow-sm' : 'opacity-70 hover:opacity-100')}
        onClick={() => onChange('open')}
      >
        Открытая
      </button>
      <button
        className={'flex-1 rounded-full px-3 py-1 text-center ' + (value === 'closed' ? 'bg-white shadow-sm' : 'opacity-70 hover:opacity-100')}
        onClick={() => onChange('closed')}
      >
        Закрытая
      </button>
    </div>
  )
}

function PriorityChips({
  value,
  onChange,
}: {
  value: '' | 'low' | 'medium' | 'high'
  onChange: (v: '' | 'low' | 'medium' | 'high') => void
}) {
  const base = 'h-8 px-3 rounded-full border text-sm inline-flex items-center justify-center transition'
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={`${base} ${value === 'low' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
        onClick={() => onChange('low')}
      >
        Low
      </button>
      <button
        type="button"
        className={`${base} ${value === 'medium' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
        onClick={() => onChange('medium')}
      >
        Med
      </button>
      <button
        type="button"
        className={`${base} ${value === 'high' ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
        onClick={() => onChange('high')}
      >
        High
      </button>
      <button
        type="button"
        className={`${base} ${value === '' ? 'bg-white shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        onClick={() => onChange('')}
        title="Без приоритета"
      >
        Нет
      </button>
    </div>
  )
}

function PriorityChipsFullWidth({
  value,
  onChange,
}: {
  value: '' | 'low' | 'medium' | 'high'
  onChange: (v: '' | 'low' | 'medium' | 'high') => void
}) {
  const base = 'flex-1 px-3 py-2 rounded-lg border text-sm inline-flex items-center justify-center transition'
  return (
    <div className="flex gap-1">
      <button
        type="button"
        className={`${base} ${value === 'low' ? 'border-green-300 bg-green-100 text-green-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
        onClick={() => onChange('low')}
      >
        Низкий
      </button>
      <button
        type="button"
        className={`${base} ${value === 'medium' ? 'border-yellow-300 bg-yellow-100 text-yellow-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
        onClick={() => onChange('medium')}
      >
        Средний
      </button>
      <button
        type="button"
        className={`${base} ${value === 'high' ? 'border-red-300 bg-red-100 text-red-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
        onClick={() => onChange('high')}
      >
        Высокий
      </button>
    </div>
  )
}

function DateQuick({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  function toISO(d: Date) {
    return d.toISOString().slice(0, 10)
  }
  const today = new Date()
  const tomorrow = new Date(Date.now() + 86400000)
  return (
    <div className="space-y-2">
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-xl border border-gray-200 px-3"
      />
      <div className="flex gap-2">
        <button type="button" className="h-8 rounded-lg border border-gray-200 px-2 text-sm hover:bg-gray-50"
          onClick={() => onChange(toISO(today))}>
          Сегодня
        </button>
        <button type="button" className="h-8 rounded-lg border border-gray-200 px-2 text-sm hover:bg-gray-50"
          onClick={() => onChange(toISO(tomorrow))}>
          Завтра
        </button>
      </div>
    </div>
  )
}

// Custom checkbox (similar style to finances list)
