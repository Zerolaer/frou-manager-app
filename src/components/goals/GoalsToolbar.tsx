import React from 'react'
import { Plus, BarChart3 } from 'lucide-react'
type Props = { onCreate: () => void; onOpenStats: () => void }
export default function GoalsToolbar({ onCreate, onOpenStats }: Props){
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold">Цели</h2>
      <div className="flex gap-2">
        <button className="btn flex items-center gap-2" onClick={onCreate}>
          <Plus className="w-4 h-4" />
          Добавить цель
        </button>
        <button className="btn-secondary flex items-center gap-2" onClick={onOpenStats}>
          <BarChart3 className="w-4 h-4" />
          Статистика
        </button>
      </div>
    </div>
  )
}
