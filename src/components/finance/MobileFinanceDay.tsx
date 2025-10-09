import React, { useMemo } from 'react'
import { format, isToday } from 'date-fns'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Cat } from '@/types/shared'
import { formatCurrencyEUR } from '@/lib/format'
import { FINANCE_TYPES } from '@/lib/constants'

interface MobileFinanceDayProps {
  date: Date
  incomeCategories: Cat[]
  expenseCategories: Cat[]
  onAddCategory: (type: 'income' | 'expense') => void
  onEditCategory: (category: Cat, monthIndex: number) => void
  onContextCategory: (e: React.MouseEvent, category: { id: string; name: string; type: 'income' | 'expense' }) => void
  onCellContext: (e: React.MouseEvent, type: 'income' | 'expense', catId: string, month: number, displayed: number) => void
  ctxCatHighlight: string | null
  ctxCellHighlight: { type: 'income' | 'expense'; catId: string; month: number } | null
  fmt: (n: number) => string
}

export default function MobileFinanceDay({
  date,
  incomeCategories,
  expenseCategories,
  onAddCategory,
  onEditCategory,
  onContextCategory,
  onCellContext,
  ctxCatHighlight,
  ctxCellHighlight,
  fmt
}: MobileFinanceDayProps) {
  const { t } = useTranslation()
  const monthIndex = date.getMonth()
  const isCurrentDay = isToday(date)

  // Calculate totals for the day
  const dayIncome = useMemo(() => {
    return incomeCategories.reduce((sum, cat) => sum + (cat.values?.[monthIndex] || 0), 0)
  }, [incomeCategories, monthIndex])

  const dayExpense = useMemo(() => {
    return expenseCategories.reduce((sum, cat) => sum + (cat.values?.[monthIndex] || 0), 0)
  }, [expenseCategories, monthIndex])

  const dayBalance = dayIncome - dayExpense

  const renderCategoryRow = (category: Cat, type: 'income' | 'expense') => {
    const amount = category.values?.[monthIndex] || 0
    const hasValue = amount !== 0
    const isHighlighted = ctxCatHighlight === category.id

    return (
      <div
        key={category.id}
        className={`flex items-center justify-between p-3 bg-white rounded-lg border ${
          isHighlighted ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{category.name}</div>
          {category.parent_id && (
            <div className="text-xs text-gray-500">{t('finance.subcategory')}</div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div
            className={`text-lg font-semibold ${
              type === 'income' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {hasValue ? fmt(amount) : '—'}
          </div>
          
          <div className="flex gap-1">
            {hasValue && (
              <button
                onClick={(e) => onCellContext(e, type, category.id, monthIndex, amount)}
                className="p-1 rounded hover:bg-gray-100"
                aria-label={t('aria.openMenu')}
              >
                <div className="w-4 h-4 rounded-full bg-gray-300" />
              </button>
            )}
            
            <button
              onClick={(e) => onContextCategory(e, { id: category.id, name: category.name, type })}
              className="p-1 rounded hover:bg-gray-100"
              aria-label={t('aria.categorySettings')}
            >
              <div className="w-4 h-4 rounded-full bg-gray-400" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* Date header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">
          {format(date, 'EEEE, d MMMM yyyy')}
        </h2>
        {isCurrentDay && (
          <div className="text-sm text-blue-600 font-medium">{t('common.today')}</div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
            <span className="text-xs font-medium text-green-600">{t('finance.income')}</span>
          </div>
          <div className="text-lg font-bold text-green-700">{fmt(dayIncome)}</div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
            <span className="text-xs font-medium text-red-600">{t('finance.expenses')}</span>
          </div>
          <div className="text-lg font-bold text-red-700">{fmt(dayExpense)}</div>
        </div>

        <div className={`border rounded-lg p-3 text-center ${
          dayBalance >= 0 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="text-xs font-medium mb-1">
            <span className={dayBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
              {t('finance.balance')}
            </span>
          </div>
          <div className={`text-lg font-bold ${
            dayBalance >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            {fmt(dayBalance)}
          </div>
        </div>
      </div>

      {/* Income section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">{t('finance.income')}</h3>
          <button
            onClick={() => onAddCategory(FINANCE_TYPES.INCOME)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('common.add')}
          </button>
        </div>
        
        <div className="space-y-2">
          {incomeCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <div>{t('finance.noIncomeCategories')}</div>
              <div className="text-sm">{t('finance.addFirstCategory')}</div>
            </div>
          ) : (
            incomeCategories.map(category => renderCategoryRow(category, 'income'))
          )}
        </div>
      </div>

      {/* Expense section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">{t('finance.expenses')}</h3>
          <button
            onClick={() => onAddCategory(FINANCE_TYPES.EXPENSE)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('common.add')}
          </button>
        </div>
        
        <div className="space-y-2">
          {expenseCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingDown className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <div>{t('finance.noExpenseCategories')}</div>
              <div className="text-sm">{t('finance.addFirstCategory')}</div>
            </div>
          ) : (
            expenseCategories.map(category => renderCategoryRow(category, 'expense'))
          )}
        </div>
      </div>
    </div>
  )
}





