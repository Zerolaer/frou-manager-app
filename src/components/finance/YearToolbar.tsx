
import React from 'react'
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
        <button className="btn" onClick={onAddCategory}>Добавить категорию</button>
        <button className="btn btn-outline text-gray-900" onClick={onShowStats}>Годовая статистика</button>
      </div>
    </div>
  )
}
