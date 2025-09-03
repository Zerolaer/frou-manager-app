import React, { useEffect, useMemo, useState } from 'react'
import '@/ui.css'
import GoalsToolbar from '@/components/goals/GoalsToolbar'
import GoalCard from '@/components/goals/GoalCard'
import GoalModal from '@/components/goals/GoalModal'
import GoalsStats from '@/components/goals/GoalsStats'
import { listGoals, createGoal, updateGoal, deleteGoal, completeGoal, type Goal, type GoalUpsert } from '@/features/goals/api'

export default function GoalsPage(){
  const [items, setItems] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const data = await listGoals()
        setItems(data)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter(g => (g.title + ' ' + (g.description ?? '')).toLowerCase().includes(q)) : items
  }, [items, query])

  const onCreate = () => { setEditing(null); setModalOpen(true) }
  const onEdit = (g: Goal) => { setEditing(g); setModalOpen(true) }
  const onDelete = async (g: Goal) => {
    if (!confirm('Удалить цель?')) return
    await deleteGoal(g.id)
    setItems(s => s.filter(x => x.id !== g.id))
  }
  const onComplete = async (g: Goal) => {
    const updated = await completeGoal(g.id)
    setItems(s => s.map(x => x.id === g.id ? updated : x))
  }
  const onSave = async (payload: GoalUpsert, id?: string) => {
    if (id) {
      const updated = await updateGoal(id, payload)
      setItems(s => s.map(x => x.id === id ? updated : x))
    } else {
      const created = await createGoal(payload)
      setItems(s => [created, ...s])
    }
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <GoalsToolbar onCreate={onCreate} onOpenStats={() => setStatsOpen(true)} />
      <div className="flex items-center gap-2">
        <input className="input w-full max-w-md" placeholder="Поиск по целям…" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-gray-500">Загрузка…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(g => (
            <GoalCard key={g.id} goal={g} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} />
          ))}
          {filtered.length === 0 && <div className="text-gray-500">Ничего не найдено</div>}
        </div>
      )}

      <GoalModal open={modalOpen} initial={editing} onClose={() => setModalOpen(false)} onSave={onSave} />
      <GoalsStats open={statsOpen} onClose={() => setStatsOpen(false)} goals={items} />
    </div>
  )
}
