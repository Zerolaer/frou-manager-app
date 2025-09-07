
import React from 'react'
type Props = {
  title: string
  onAdd: () => void
}

export default function SectionHeader({ title, onAdd }: Props){
  return (
    <div className="finance-section">
      <span>{title}</span>
      <button className="btn btn-outline btn-xs text-gray-900" onClick={onAdd}>+ Категория</button>
    </div>
  )
}
