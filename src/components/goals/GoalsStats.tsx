import React from 'react'
import Modal from '@/components/Modal'
import { Goal } from '@/features/goals/api'

type Props = { open: boolean; onClose: () => void; goals: Goal[] }

export default function GoalsStats({ open, onClose, goals }: Props){
  const total = goals.length
  const completed = goals.filter(g => g.status === 'completed').length
  const active = total - completed
  const avg = Math.round((goals.reduce((s, g) => s + (g.progress ?? 0), 0) / Math.max(1, total)))

  return (
    <Modal open={open} onClose={onClose} title="Статистика по целям">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-500">Всего целей</div>
          <div className="text-2xl font-semibold">{total}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-500">Выполнено</div>
          <div className="text-2xl font-semibold">{completed}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-500">В процессе</div>
          <div className="text-2xl font-semibold">{active}</div>
        </div>
      </div>
      <div className="mt-6 bg-white border rounded-lg p-4">
        <div className="text-sm text-gray-500 mb-2">Средний прогресс</div>
        <div className="w-full h-2 bg-gray-100 rounded">
          <div className="h-2 bg-blue-600 rounded" style={{ width: `${avg}%` }} />
        </div>
      </div>
    </Modal>
  )
}
