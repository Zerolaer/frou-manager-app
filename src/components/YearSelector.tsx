import React from 'react'
import { Calendar } from 'lucide-react'
import Dropdown, { DropdownOption } from './ui/Dropdown'

interface YearSelectorProps {
  currentYear: number
  onYearChange: (year: number) => void
}

export default function YearSelector({ currentYear, onYearChange }: YearSelectorProps) {
  // Generate years array (current year ± 3)
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i)
  
  const options: DropdownOption[] = years.map(year => ({
    value: year,
    label: year.toString()
  }))

  return (
    <Dropdown
      options={options}
      value={currentYear}
      onChange={onYearChange}
      icon={<Calendar className="w-4 h-4" />}
      aria-label="Выбрать год"
    />
  )
}
