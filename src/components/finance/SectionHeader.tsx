
import React from 'react'
import Button from '@/components/ui/Button'

type Props = {
  title: string
  onAdd: () => void
}

export default function SectionHeader({ title, onAdd }: Props){
  return (
    <div className="finance-section">
      <span>{title}</span>
      <Button variant="outline" size="xs" onClick={onAdd}>+ Категория</Button>
    </div>
  )
}
