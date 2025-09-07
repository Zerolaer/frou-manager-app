
import React from 'react'
import Button from '@/components/ui/Button'
import YearDropdown from '@/components/YearDropdown'

type Props = {
  year: number
  years: number[]
  onYearChange: (y: number) => void
  onAddCategory: () => void
  onShowStats: () => void
}

export default function YearToolbar({ year, years, onYearChange, onAddCategory, onShowStats }: Props){
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <YearDropdown value={year} years={years} onChange={onYearChange} />
      </div>
      <div className="flex gap-3">
        <Button onClick={onAddCategory}>Добавить категорию</Button>
        <Button variant="outline" onClick={onShowStats}>Годовая статистика</Button>
      </div>
    </div>
  )
}
