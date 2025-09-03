import React, { useEffect, useState } from 'react'
import Modal from '@/components/Modal'
import { Goal, GoalUpsert, GoalCategory, Priority } from '@/features/goals/api'

type Props = {
  open: boolean
  initial?: Goal | null
  onClose: () => void
  onSave: (values: GoalUpsert, id?: string) => void
}

const categories: GoalCategory[] = ['Здоровье', 'Финансы', 'Работа', 'Обучение', 'Прочее']
const priorities: Priority[] = ['low', 'medium', 'high']

export default function GoalModal({ open, initial, onClose, onSave }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<GoalCategory | ''>('')
  const [deadline, setDeadline] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const [priority, setPriority] = useState<Priority>('medium')

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || '')
      setDescription(initial.description || '')
      setCategory((initial.category as Goal['category']) || 'Прочее')
      setDeadline(initial.deadline || '')
      setProgress(initial.progress ?? 0)
      setPriority(initial.priority ?? 'medium')
    } else {
      setTitle(''); setDescription(''); setCategory(''); setDeadline(''); setProgress(0); setPriority('medium')
    }
  }, [initial, open])

  const footer = (
    <div className="flex justify-end gap-2">
      <button className="btn-secondary" onClick={onClose}>Отмена</button>
      <button
        className="btn"
        onClick={() => onSave({
          title,
          description,
          category: (category || 'Прочее') as any,
          deadline: deadline || null,
          progress,
          priority,
          status: progress >= 100 ? 'completed' : 'active'
        }, initial?.id)}
        disabled={!title.trim()}
      >
        {initial ? 'Сохранить' : 'Создать'}
      </button>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Редактировать цель' : 'Новая цель'} footer={footer}>
      <div className="space-y-4">
        <div>
          <label className="label">Название</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Например, Сбросить 5 кг" />
        </div>
        <div>
          <label className="label">Описание</label>
          <textarea className="textarea" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Категория</label>
            <select className="input" value={category} onChange={e => setCategory(e.target.value as any)}>
              <option value="">Выбрать…</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Дедлайн</label>
            <input className="input" type="date" value={deadline ?? ''} onChange={e => setDeadline(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Прогресс (%)</label>
            <input className="input" type="number" min={0} max={100} value={progress} onChange={e => setProgress(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Приоритет</label>
            <select className="input" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
              {priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  )
}
