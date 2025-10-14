import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, TrendingUp, TrendingDown, MoreVertical } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabaseClient'
import MobileLayout from '@/components/mobile/MobileLayout'
import MobileFinanceAddModal from '@/components/mobile/MobileFinanceAddModal'
import MobileCellEditor from '@/components/mobile/MobileCellEditor'
import { FINANCE_TYPES, MONTHS_IN_YEAR } from '@/lib/constants'
import { useFinanceCache } from '@/hooks/useFinanceCache'

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  parent_id: string | null
  values: number[]
}

export default function FinanceMobile() {
  const { t } = useSafeTranslation()
  const { userId } = useSupabaseAuth()
  const { writeCache } = useFinanceCache()
  const now = new Date()
  
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [income, setIncome] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const monthNames = [
    t('finance.months.jan'), t('finance.months.feb'), t('finance.months.mar'),
    t('finance.months.apr'), t('finance.months.may'), t('finance.months.jun'),
    t('finance.months.jul'), t('finance.months.aug'), t('finance.months.sep'),
    t('finance.months.oct'), t('finance.months.nov'), t('finance.months.dec')
  ]

  // Load data
  React.useEffect(() => {
    if (!userId) return

    const loadData = async () => {
      setLoading(true)
      try {
        const [catsRes, entriesRes] = await Promise.all([
          supabase.from('finance_categories').select('id,name,type,parent_id').order('created_at'),
          supabase.from('finance_entries').select('category_id,month,amount,included').eq('year', currentYear)
        ])

        if (catsRes.error || entriesRes.error) {
          console.error('Error loading finance data')
          return
        }

        const cats = catsRes.data || []
        const entries = entriesRes.data || []
        const byId: Record<string, number[]> = {}

        cats.forEach(c => byId[c.id] = Array(MONTHS_IN_YEAR).fill(0))
        entries.forEach(e => {
          if (!e.included) return
          const idx = Math.min(11, Math.max(0, (e.month as number) - 1))
          const id = e.category_id as string
          if (!byId[id]) byId[id] = Array(MONTHS_IN_YEAR).fill(0)
          byId[id][idx] += Number(e.amount) || 0
        })

        setIncome(cats.filter(c => c.type === FINANCE_TYPES.INCOME).map(c => ({ 
          ...c, 
          type: 'income' as const, 
          values: byId[c.id] || Array(MONTHS_IN_YEAR).fill(0) 
        })))
        setExpenses(cats.filter(c => c.type === FINANCE_TYPES.EXPENSE).map(c => ({ 
          ...c, 
          type: 'expense' as const, 
          values: byId[c.id] || Array(MONTHS_IN_YEAR).fill(0) 
        })))
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [userId, currentYear])

  const totals = useMemo(() => {
    const totalIncome = income.reduce((sum, cat) => sum + (cat.values[currentMonth] || 0), 0)
    const totalExpense = expenses.reduce((sum, cat) => sum + (cat.values[currentMonth] || 0), 0)
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense }
  }, [income, expenses, currentMonth])

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
  }

  const isCurrentMonth = currentMonth === now.getMonth() && currentYear === now.getFullYear()
  
  // Add category
  const handleAddCategory = async (type: 'income' | 'expense', name: string) => {
    if (!name.trim() || !userId) return
    
    try {
      const { data, error } = await supabase
        .from('finance_categories')
        .insert({ user_id: userId, type, name: name.trim() })
        .select('id,name,type,parent_id')
        .single()
      
      if (error) throw error
      
      const newCat: Category = {
        id: data.id,
        name: data.name,
        type: data.type,
        parent_id: data.parent_id,
        values: Array(MONTHS_IN_YEAR).fill(0)
      }
      
      if (type === 'income') {
        setIncome([...income, newCat])
      } else {
        setExpenses([...expenses, newCat])
      }
      
      console.log(`Category created: ${name}`)
    } catch (error) {
      console.error('Error creating category:', error)
    }
  }
  
  // Open cell editor
  const handleCellClick = (category: Category) => {
    setEditingCategory(category)
    setEditorOpen(true)
  }
  
  // Update cell value
  const handleCellUpdate = (sum: number) => {
    if (!editingCategory) return
    
    const updateCategories = (cats: Category[]) =>
      cats.map(c => c.id === editingCategory.id ? {
        ...c,
        values: c.values.map((v, i) => i === currentMonth ? sum : v)
      } : c)
    
    if (editingCategory.type === 'income') {
      setIncome(updateCategories(income))
    } else {
      setExpenses(updateCategories(expenses))
    }
  }

  return (
    <MobileLayout title={t('nav.finance')}>
      {/* Month Navigator */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={handlePrevMonth} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <div className="text-base font-semibold text-gray-900">
              {monthNames[currentMonth]} {currentYear}
            </div>
            {isCurrentMonth && (
              <div className="text-xs text-gray-600 font-medium px-2 py-0.5 bg-gray-100 rounded">{t('common.currentMonth')}</div>
            )}
          </div>
          <button onClick={handleNextMonth} className="p-2 -mr-2 rounded-lg hover:bg-gray-100">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-xs text-gray-600 font-medium">{t('finance.income')}</span>
          </div>
          <div className="text-base font-bold text-gray-900">{formatCurrency(totals.totalIncome)}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-xs text-gray-600 font-medium">{t('finance.expenses')}</span>
          </div>
          <div className="text-base font-bold text-gray-900">{formatCurrency(totals.totalExpense)}</div>
        </div>

        <div className="bg-white border border-gray-300 rounded-xl p-3">
          <div className="text-xs font-medium mb-1 text-gray-600">
            {t('finance.balance')}
          </div>
          <div className="text-base font-bold text-gray-900">
            {formatCurrency(totals.balance)}
          </div>
        </div>
      </div>

      {/* Income Section */}
      <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">{t('finance.income')}</h3>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('common.add')}
                </button>
              </div>
        <div className="space-y-2">
          {income.map(cat => {
            const amount = cat.values[currentMonth] || 0
            return (
              <div 
                key={cat.id} 
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 active:bg-gray-50"
                onClick={() => handleCellClick(cat)}
              >
                <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(amount)}</span>
              </div>
            )
          })}
          {income.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-500">
              {t('finance.noIncomeCategories')}
            </div>
          )}
        </div>
      </div>

      {/* Expense Section */}
      <div className="px-4 pb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">{t('finance.expenses')}</h3>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('common.add')}
                </button>
              </div>
        <div className="space-y-2">
          {expenses.map(cat => {
            const amount = cat.values[currentMonth] || 0
            return (
              <div 
                key={cat.id} 
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 active:bg-gray-50"
                onClick={() => handleCellClick(cat)}
              >
                <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(amount)}</span>
              </div>
            )
          })}
          {expenses.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-500">
              {t('finance.noExpenseCategories')}
            </div>
          )}
        </div>
      </div>
      
      {/* Add Category Modal */}
      <MobileFinanceAddModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddCategory={handleAddCategory}
      />
      
      {/* Cell Editor Modal */}
      {editorOpen && editingCategory && (
        <MobileCellEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          userId={userId!}
          categoryId={editingCategory.id}
          categoryName={editingCategory.name}
          monthIndex={currentMonth}
          year={currentYear}
          onApply={handleCellUpdate}
        />
      )}
    </MobileLayout>
  )
}

