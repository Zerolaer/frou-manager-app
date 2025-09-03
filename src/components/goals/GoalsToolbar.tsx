import React from 'react'
type Props = { onCreate: () => void; onOpenStats: () => void }
export default function GoalsToolbar({ onCreate, onOpenStats }: Props){
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold">Цели</h2>
      <div className="flex gap-2">
        <button className="btn" onClick={onCreate}>+ Добавить цель</button>
        <button className="btn-secondary" onClick={onOpenStats}>Статистика</button>
      </div>
    </div>
  )
}
