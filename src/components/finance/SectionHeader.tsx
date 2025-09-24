
import React from 'react'
import { Plus } from 'lucide-react'
type Props = {
  title: string
  onAdd: () => void
}

export default function SectionHeader({ title, onAdd }: Props){
  return (
    <div className="finance-section">
      <span>{title}</span>
      <button className="btn btn-outline btn-xs text-gray-900 flex items-center gap-1" onClick={onAdd}>
        <Plus className="w-3 h-3" />
        Категория
      </button>
    </div>
  )
}
