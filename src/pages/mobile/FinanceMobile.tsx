import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Wallet } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabaseClient'
import MobileLayout from '@/components/mobile/MobileLayout'
import MobileFinanceAddModal from '@/components/mobile/MobileFinanceAddModal'
import MobileCellEditor from '@/components/mobile/MobileCellEditor'
import { Skeleton } from '@/components/ui/Skeleton'
import { FINANCE_TYPES, MONTHS_IN_YEAR } from '@/lib/constants'
import { useFinanceCache } from '@/hooks/useFinanceCache'
import { convertToEUR, initializeExchangeRates } from '@/utils/currency'
import {
  computeDescendantSums,
  canAddSubcategory,
  buildCategoryHasDirectEntries,
  toFinanceCacheCat,
  buildChildrenMap,
  applyCollapse,
} from '@/features/finance/utils'
import type { Cat } from '@/types/shared'
import { cn } from '@/lib/utils'

type Category = Cat

function getCategoryAmount(
  category: Category,
  monthIndex: number,
  childrenMap: Record<string, number>,
  aggregatedByParent: Record<string, number[]>
): number {
  const hasChildren = (childrenMap[category.id] || 0) > 0
  if (hasChildren) return aggregatedByParent[category.id]?.[monthIndex] ?? 0
  return category.values[monthIndex] || 0
}

function CategoryRow({
  category,
  amount,
  onClick,
  formatCurrency,
  hasChildren,
  collapsed,
  onToggleCollapse,
  collapseLabel,
  expandLabel,
}: {
  category: Category
  amount: number
  onClick: () => void
  formatCurrency: (n: number) => string
  hasChildren: boolean
  collapsed: boolean
  onToggleCollapse: () => void
  collapseLabel: string
  expandLabel: string
}) {
  const isSubcategory = !!category.parent_id
  const hasValue = amount !== 0

  return (
    <div
      className={cn(
        'flex min-h-[3.25rem] w-full items-center rounded-xl border bg-white',
        isSubcategory
          ? 'mx-auto w-[calc(100%-1.25rem)] border-gray-100'
          : 'border-gray-200'
      )}
    >
      {hasChildren && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleCollapse()
          }}
          className="finance-mobile-collapse-btn ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white p-0 active:bg-gray-50"
          aria-label={collapsed ? expandLabel : collapseLabel}
          aria-expanded={!collapsed}
        >
          <ChevronRight
            size={20}
            className={cn(
              'finance-mobile-collapse-icon shrink-0 text-gray-600 transition-transform duration-200',
              collapsed ? 'rotate-0' : 'rotate-90'
            )}
            strokeWidth={2.25}
          />
        </button>
      )}
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex flex-1 min-w-0 items-center justify-between py-3.5 text-left active:bg-gray-50 transition-colors rounded-xl',
          hasChildren ? 'px-3 pr-4' : 'px-4'
        )}
      >
        <div className="flex flex-1 min-w-0 items-center gap-3 pr-3">
          {isSubcategory && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <Wallet className="h-4 w-4 text-gray-500" strokeWidth={2} />
            </div>
          )}
          <div
            className={cn(
              'truncate',
              isSubcategory ? 'text-sm text-gray-800' : 'text-sm font-semibold text-gray-900'
            )}
          >
            {category.name}
          </div>
        </div>
        <span
          className={cn(
            'text-sm font-semibold shrink-0 tabular-nums',
            hasValue ? 'text-gray-900' : 'text-gray-400'
          )}
        >
          {hasValue ? formatCurrency(amount) : '—'}
        </span>
      </button>
    </div>
  )
}

function CategorySkeleton() {
  return (
    <div className="flex min-h-[3.25rem] items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3.5">
      <Skeleton variant="text" className="h-4 w-32" />
      <Skeleton variant="text" className="h-4 w-16" />
    </div>
  )
}

export default function FinanceMobile() {
  const { t } = useSafeTranslation()
  const { userId } = useSupabaseAuth()
  const { writeCache, readCache } = useFinanceCache()
  const now = new Date()
  const baseYear = now.getFullYear()

  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(baseYear)
  const [income, setIncome] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Category[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const dataReadyRef = useRef(false)

  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalType, setAddModalType] = useState<'income' | 'expense'>('income')
  const [addModalParent, setAddModalParent] = useState<{ id: string; name: string } | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorHasChildren, setEditorHasChildren] = useState(false)
  const [editorAggregatedAmount, setEditorAggregatedAmount] = useState(0)

  const monthNames = useMemo(
    () => [
      t('finance.months.jan'),
      t('finance.months.feb'),
      t('finance.months.mar'),
      t('finance.months.apr'),
      t('finance.months.may'),
      t('finance.months.jun'),
      t('finance.months.jul'),
      t('finance.months.aug'),
      t('finance.months.sep'),
      t('finance.months.oct'),
      t('finance.months.nov'),
      t('finance.months.dec'),
    ],
    [t]
  )

  const persistCache = useCallback(
    (inc: Category[], exp: Category[]) => {
      if (!userId) return
      writeCache(userId, currentYear, {
        income: inc.map(toFinanceCacheCat),
        expense: exp.map(toFinanceCacheCat),
      })
    },
    [userId, currentYear, writeCache]
  )

  const incomeCategories = useMemo(() => applyCollapse(income, collapsed), [income, collapsed])
  const expenseCategories = useMemo(() => applyCollapse(expenses, collapsed), [expenses, collapsed])

  const childrenMapIncome = useMemo(() => buildChildrenMap(income), [income])
  const childrenMapExpense = useMemo(() => buildChildrenMap(expenses), [expenses])
  const aggregatedIncomeByParent = useMemo(() => computeDescendantSums(income), [income])
  const aggregatedExpenseByParent = useMemo(() => computeDescendantSums(expenses), [expenses])

  const monthTotals = useMemo(() => {
    const totalIncome = income.reduce((s, c) => s + (c.values[currentMonth] ?? 0), 0)
    const totalExpenses = expenses.reduce((s, c) => s + (c.values[currentMonth] ?? 0), 0)
    return {
      income: totalIncome,
      expenses: totalExpenses,
      balance: totalIncome - totalExpenses,
    }
  }, [income, expenses, currentMonth])

  useEffect(() => {
    if (!userId) return

    const cached = readCache(userId, currentYear)
    if (cached) {
      setIncome((cached.income ?? []).map((c) => ({ ...c, type: 'income' as const, hasDirectEntries: c.hasDirectEntries ?? false })))
      setExpenses((cached.expense ?? []).map((c) => ({ ...c, type: 'expense' as const, hasDirectEntries: c.hasDirectEntries ?? false })))
      setLoading(false)
      dataReadyRef.current = true
    } else {
      dataReadyRef.current = false
    }

    const ctl = new AbortController()

    const loadData = async () => {
      if (!dataReadyRef.current) setLoading(true)
      try {
        await initializeExchangeRates()

        const [catsRes, entriesRes] = await Promise.all([
          supabase.from('finance_categories').select('id,name,type,parent_id').order('created_at'),
          supabase
            .from('finance_entries')
            .select('category_id,month,amount,currency,included')
            .eq('year', currentYear),
        ])

        if (ctl.signal.aborted) return

        if (catsRes.error || entriesRes.error) {
          console.error('Error loading finance data')
          return
        }

        const cats = catsRes.data || []
        const entries = entriesRes.data || []
        const byId: Record<string, number[]> = {}
        const entryFlags = buildCategoryHasDirectEntries(entries)

        cats.forEach((c) => {
          byId[c.id] = Array(MONTHS_IN_YEAR).fill(0)
        })
        entries.forEach((e) => {
          if (!e.included) return
          const idx = Math.min(11, Math.max(0, (e.month as number) - 1))
          const id = e.category_id as string
          if (!byId[id]) byId[id] = Array(MONTHS_IN_YEAR).fill(0)
          const currency = (e.currency || 'EUR') as 'EUR' | 'USD' | 'GEL'
          const amountInEUR = convertToEUR(Number(e.amount) || 0, currency)
          byId[id][idx] += amountInEUR
        })

        const nextIncome = cats
          .filter((c) => c.type === FINANCE_TYPES.INCOME)
          .map((c) => ({
            id: c.id,
            name: c.name,
            type: 'income' as const,
            parent_id: c.parent_id,
            values: byId[c.id] || Array(MONTHS_IN_YEAR).fill(0),
            hasDirectEntries: !!entryFlags[c.id],
          }))
        const nextExpenses = cats
          .filter((c) => c.type === FINANCE_TYPES.EXPENSE)
          .map((c) => ({
            id: c.id,
            name: c.name,
            type: 'expense' as const,
            parent_id: c.parent_id,
            values: byId[c.id] || Array(MONTHS_IN_YEAR).fill(0),
            hasDirectEntries: !!entryFlags[c.id],
          }))

        if (!ctl.signal.aborted) {
          setIncome(nextIncome)
          setExpenses(nextExpenses)
          dataReadyRef.current = true
          persistCache(nextIncome, nextExpenses)
        }
      } finally {
        if (!ctl.signal.aborted) setLoading(false)
      }
    }

    loadData()
    return () => ctl.abort()
  }, [userId, currentYear, readCache, persistCache])

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const openAddModal = (
    type: 'income' | 'expense',
    parent?: { id: string; name: string } | null
  ) => {
    setAddModalType(type)
    setAddModalParent(parent ?? null)
    setShowAddModal(true)
  }

  const handleAddCategory = async (
    type: 'income' | 'expense',
    name: string,
    parentId?: string
  ) => {
    if (!name.trim() || !userId) return

    if (parentId) {
      const parent = (type === 'income' ? income : expenses).find((c) => c.id === parentId)
      if (!parent || !canAddSubcategory(parent)) return
    }

    try {
      const payload: {
        user_id: string
        type: 'income' | 'expense'
        name: string
        parent_id?: string
      } = { user_id: userId, type, name: name.trim() }
      if (parentId) payload.parent_id = parentId

      const { data, error } = await supabase
        .from('finance_categories')
        .insert(payload)
        .select('id,name,type,parent_id')
        .single()

      if (error) throw error

      const newCat: Category = {
        id: data.id,
        name: data.name,
        type: data.type,
        parent_id: data.parent_id,
        values: Array(MONTHS_IN_YEAR).fill(0),
      }

      if (type === 'income') {
        const next = [...income, newCat]
        setIncome(next)
        persistCache(next, expenses)
      } else {
        const next = [...expenses, newCat]
        setExpenses(next)
        persistCache(income, next)
      }
    } catch (error) {
      console.error('Error creating category:', error)
    }
  }

  const handleCellClick = (category: Category) => {
    const childrenMap = category.type === 'income' ? childrenMapIncome : childrenMapExpense
    const aggregated =
      category.type === 'income' ? aggregatedIncomeByParent : aggregatedExpenseByParent
    const hasChildren = (childrenMap[category.id] || 0) > 0
    const amount = getCategoryAmount(category, currentMonth, childrenMap, aggregated)

    setEditingCategory(category)
    setEditorHasChildren(hasChildren)
    setEditorAggregatedAmount(amount)
    setEditorOpen(true)
  }

  const handleAddSubcategoryFromEditor = () => {
    if (!editingCategory || !canAddSubcategory(editingCategory)) return
    setEditorOpen(false)
    openAddModal(editingCategory.type, { id: editingCategory.id, name: editingCategory.name })
  }

  const handleCellUpdate = async (sum: number, hasEntriesInCell: boolean) => {
    if (!editingCategory) return

    let hasDirectEntries = hasEntriesInCell
    if (!hasEntriesInCell) {
      const { count, error } = await supabase
        .from('finance_entries')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', editingCategory.id)
        .eq('year', currentYear)
      hasDirectEntries = !error && (count ?? 0) > 0
    }

    const updateCategories = (cats: Category[]) =>
      cats.map((c) =>
        c.id === editingCategory.id
          ? {
              ...c,
              values: c.values.map((v, i) => (i === currentMonth ? sum : v)),
              hasDirectEntries,
            }
          : c
      )

    const updatedCategory = {
      ...editingCategory,
      values: editingCategory.values.map((v, i) => (i === currentMonth ? sum : v)),
      hasDirectEntries,
    }

    if (editingCategory.type === 'income') {
      const next = updateCategories(income)
      setIncome(next)
      persistCache(next, expenses)
    } else {
      const next = updateCategories(expenses)
      setExpenses(next)
      persistCache(income, next)
    }
    setEditingCategory(updatedCategory)
  }

  const showSkeleton = loading && !dataReadyRef.current

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const renderCategoryList = (
    categories: Category[],
    childrenMap: Record<string, number>,
    aggregatedByParent: Record<string, number[]>
  ) => {
    let parentGroupIndex = -1

    return categories
      .filter((cat) => !cat.isCollapsed)
      .map((cat) => {
        const isParent = !cat.parent_id
        if (isParent) parentGroupIndex += 1

        const hasChildren = (childrenMap[cat.id] || 0) > 0

        return (
          <div
            key={cat.id}
            className={cn(isParent && parentGroupIndex > 0 && 'mt-1')}
          >
            <CategoryRow
              category={cat}
              amount={getCategoryAmount(
                cat,
                currentMonth,
                childrenMap,
                aggregatedByParent
              )}
              onClick={() => handleCellClick(cat)}
              formatCurrency={formatCurrency}
              hasChildren={hasChildren}
              collapsed={!!collapsed[cat.id]}
              onToggleCollapse={() => toggleCollapse(cat.id)}
              collapseLabel={t('aria.collapse')}
              expandLabel={t('aria.expand')}
            />
          </div>
        )
      })
  }

  return (
    <MobileLayout>
      {/* Month Navigator */}
      <div className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-md safe-area-top">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg active:bg-gray-100"
            aria-label={t('aria.previousDay')}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" strokeWidth={2.25} />
          </button>

          <div className="min-w-0 flex-1 text-center text-sm font-semibold text-gray-900 truncate tabular-nums">
            {monthNames[currentMonth]} {currentYear}
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg active:bg-gray-100"
            aria-label={t('aria.nextDay')}
          >
            <ChevronRight className="w-5 h-5 text-gray-600" strokeWidth={2.25} />
          </button>
        </div>
      </div>

      {/* Income Section */}
      <div className="px-4 pb-6 pt-3">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{t('finance.income')}</h3>
          <button
            type="button"
            onClick={() => openAddModal('income')}
            className="flex min-h-11 items-center gap-1.5 px-3 text-xs font-medium text-gray-900 bg-gray-100 rounded-xl active:bg-gray-200"
          >
            <Plus className="w-4 h-4" />
            {t('common.add')}
          </button>
        </div>
        <div className="space-y-3">
          {showSkeleton ? (
            <>
              <CategorySkeleton />
              <CategorySkeleton />
              <CategorySkeleton />
            </>
          ) : (
            <>
              {renderCategoryList(
                incomeCategories,
                childrenMapIncome,
                aggregatedIncomeByParent
              )}
              {income.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-500">
                  {t('finance.noIncomeCategories')}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Expense Section */}
      <div className="border-t border-gray-100 px-4 pb-4 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{t('finance.expenses')}</h3>
          <button
            type="button"
            onClick={() => openAddModal('expense')}
            className="flex min-h-11 items-center gap-1.5 px-3 text-xs font-medium text-gray-900 bg-gray-100 rounded-xl active:bg-gray-200"
          >
            <Plus className="w-4 h-4" />
            {t('common.add')}
          </button>
        </div>
        <div className="space-y-3">
          {showSkeleton ? (
            <>
              <CategorySkeleton />
              <CategorySkeleton />
              <CategorySkeleton />
            </>
          ) : (
            <>
              {renderCategoryList(
                expenseCategories,
                childrenMapExpense,
                aggregatedExpenseByParent
              )}
              {expenses.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-500">
                  {t('finance.noExpenseCategories')}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Month Summary */}
      <div className="border-t border-gray-100 px-4 pb-2 pt-3">
        <div className="rounded-xl border border-gray-200 bg-white/90 px-3 py-3 shadow-sm backdrop-blur-sm">
          {showSkeleton ? (
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <Skeleton variant="text" className="h-3 w-12" />
                  <Skeleton variant="text" className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <div className="flex flex-col items-center gap-0.5 px-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  {t('finance.income')}
                </span>
                <span className="text-sm font-semibold tabular-nums text-gray-900">
                  {formatCurrency(monthTotals.income)}
                </span>
              </div>
              <div className="flex flex-col items-center gap-0.5 px-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  {t('finance.expenses')}
                </span>
                <span className="text-sm font-semibold tabular-nums text-gray-900">
                  {formatCurrency(monthTotals.expenses)}
                </span>
              </div>
              <div className="flex flex-col items-center gap-0.5 px-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  {t('finance.balance')}
                </span>
                <span
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    monthTotals.balance > 0
                      ? 'text-emerald-600'
                      : monthTotals.balance < 0
                        ? 'text-red-600'
                        : 'text-gray-900'
                  )}
                >
                  {formatCurrency(monthTotals.balance)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <MobileFinanceAddModal
        open={showAddModal}
        initialType={addModalType}
        parentCategory={addModalParent}
        onClose={() => {
          setShowAddModal(false)
          setAddModalParent(null)
        }}
        onAddCategory={handleAddCategory}
      />

      {editorOpen && editingCategory && userId && (
        <MobileCellEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          userId={userId}
          categoryId={editingCategory.id}
          categoryName={editingCategory.name}
          monthIndex={currentMonth}
          year={currentYear}
          onApply={handleCellUpdate}
          readOnly={editorHasChildren}
          aggregatedTotal={editorAggregatedAmount}
          isParentCategory={!editingCategory.parent_id}
          canAddSubcategory={canAddSubcategory(editingCategory)}
          onAddSubcategory={handleAddSubcategoryFromEditor}
        />
      )}
    </MobileLayout>
  )
}
