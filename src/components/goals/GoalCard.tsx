import React from 'react'
import { MoreVertical, Calendar, CheckCircle2, Trash2 } from 'lucide-react'
import { Goal } from '@/features/goals/api'

type Props = {
  goal: Goal
  onEdit: (g: Goal) => void
  onDelete: (g: Goal) => void
  onComplete: (g: Goal) => void
}

export default function GoalCard({ goal, onEdit, onDelete, onComplete }: Props) {
  const p = Math.max(0, Math.min(100, goal.progress ?? 0))
  const barCls = p >= 100 ? 'bg-green-600' : p >= 66 ? 'bg-blue-600' : p >= 33 ? 'bg-amber-500' : 'bg-gray-300'

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{goal.title}</h3>
          {goal.description && <p className="text-sm text-gray-600 line-clamp-2">{goal.description}</p>}
        </div>
        <button className="p-2 text-gray-500 hover:text-gray-900" onClick={() => onEdit(goal)} aria-label="Edit goal menu">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full h-2 rounded bg-gray-100 overflow-hidden">
        <div className={`h-full ${barCls}`} style={{ width: `${p}%` }} />
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          {goal.deadline && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(goal.deadline).toLocaleDateString()}</span>
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{goal.category ?? 'Прочее'}</span>
        </div>
        <div className="flex items-center gap-2">
          {goal.status !== 'completed' && (
            <button className="btn btn-sm" onClick={() => onComplete(goal)}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Завершить
            </button>
          )}
          <button className="btn-danger btn-sm" onClick={() => onDelete(goal)}>
            <Trash2 className="w-4 h-4 mr-1" /> Удалить
          </button>
        </div>
      </div>
    </div>
  )
}
