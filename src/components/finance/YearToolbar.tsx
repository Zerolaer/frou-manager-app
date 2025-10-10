
import React from 'react'
import { YearDropdown } from '@/components/ui/UnifiedDropdown'
import { Plus, BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Props = {
  year: number
  years: number[]
  onYearChange: (y: number) => void
  onAddCategory: () => void
  onShowStats: () => void
}

export default function YearToolbar({ year, years, onYearChange, onAddCategory, onShowStats }: Props){
  const { t } = useTranslation()
  
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <YearDropdown value={year} years={years} onChange={(value) => onYearChange(typeof value === 'number' ? value : parseInt(String(value)))} />
      </div>
      <div className="flex gap-3">
        <button className="btn flex items-center gap-2" onClick={onAddCategory}>
          <Plus className="w-4 h-4" />
          {t('finance.addCategory')}
        </button>
        <button className="btn btn-outline text-gray-900 flex items-center gap-2" onClick={onShowStats}>
          <BarChart3 className="w-4 h-4" />
          {t('finance.annualStats')}
        </button>
      </div>
    </div>
  )
}
