import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabaseClient'
import MobileLayout from '@/components/mobile/MobileLayout'
import MobileCellEditor from '@/components/mobile/MobileCellEditor'
import MobileFinanceCategoryRow from '@/components/mobile/MobileFinanceCategoryRow'
import { Skeleton } from '@/components/ui/Skeleton'
import FinanceChatPanel from '@/components/finance/FinanceChatPanel'
import { FINANCE_TYPES, MONTHS_IN_YEAR } from '@/lib/constants'
import { useFinanceCache } from '@/hooks/useFinanceCache'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { convertToEUR, initializeExchangeRates } from '@/utils/currency'
import {
  computeDescendantSums,
  buildCategoryHasDirectEntries,
  toFinanceCacheCat,
  buildChildrenMap,
} from '@/features/finance/utils'
import { hapticLightTap, hapticSelection } from '@/platform/haptics'
import { logger } from '@/lib/monitoring'
import { cn } from '@/lib/utils'
import type { Cat, MoneyType } from '@/types/shared'

type Category = Cat

const EUR = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

function formatCurrency(amount: number) {
  return EUR.format(amount)
}

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

async function resolveCategoryHasDirectEntries(
  categoryId: string,
  year: number,
  hasEntriesInCell: boolean
): Promise<boolean> {
  if (hasEntriesInCell) return true
  const { count, error } = await supabase
    .from('finance_entries')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .eq('year', year)
  if (error) {
    logger.error('Error checking category entries:', error)
    return true
  }
  return (count ?? 0) > 0
}

export default function FinanceMobile() {
  const { t } = useSafeTranslation()
  const { userId } = useSupabaseAuth()
  const { writeCache, readCache } = useFinanceCache()
  const now = new Date()
  const calendarYear = now.getFullYear()
  const calendarMonth = now.getMonth()

  const [currentMonth, setCurrentMonth] = useState(calendarMonth)
  const [currentYear, setCurrentYear] = useState(calendarYear)
  const [income, setIncome] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Category[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const dataReadyRef = useRef(false)

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMonth, setEditorMonth] = useState(calendarMonth)
  const [activeLedger, setActiveLedger] = useState<MoneyType | null>(null)
  const [showAIChat, setShowAIChat] = useState(false)

  const swipeRef = useRef({ x: 0, y: 0, active: false })

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

  const childrenMapIncome = useMemo(() => buildChildrenMap(income), [income])
  const childrenMapExpense = useMemo(() => buildChildrenMap(expenses), [expenses])
  const aggregatedIncomeByParent = useMemo(() => computeDescendantSums(income), [income])
  const aggregatedExpenseByParent = useMemo(() => computeDescendantSums(expenses), [expenses])

  const incomeParents = useMemo(() => income.filter((c) => !c.parent_id), [income])
  const expenseParents = useMemo(() => expenses.filter((c) => !c.parent_id), [expenses])
  const incomeChildrenByParent = useMemo(() => {
    const map: Record<string, Category[]> = {}
    for (const c of income) if (c.parent_id) (map[c.parent_id] ||= []).push(c)
    return map
  }, [income])
  const expenseChildrenByParent = useMemo(() => {
    const map: Record<string, Category[]> = {}
    for (const c of expenses) if (c.parent_id) (map[c.parent_id] ||= []).push(c)
    return map
  }, [expenses])

  const monthTotals = useMemo(() => {
    const totalIncome = income.reduce((s, c) => s + (c.values[currentMonth] ?? 0), 0)
    const totalExpenses = expenses.reduce((s, c) => s + (c.values[currentMonth] ?? 0), 0)
    return {
      income: totalIncome,
      expenses: totalExpenses,
      balance: totalIncome - totalExpenses,
    }
  }, [income, expenses, currentMonth])

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      if (!userId) return
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
        if (signal?.aborted) return
        if (catsRes.error || entriesRes.error) {
          logger.error('Error loading finance data', catsRes.error || entriesRes.error)
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
          byId[id][idx] += convertToEUR(Number(e.amount) || 0, currency)
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

        if (!signal?.aborted) {
          setIncome(nextIncome)
          setExpenses(nextExpenses)
          dataReadyRef.current = true
          persistCache(nextIncome, nextExpenses)
        }
      } catch (error) {
        if (!signal?.aborted) logger.error('Error loading finance data', error)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [userId, currentYear, persistCache]
  )

  useEffect(() => {
    if (!userId) return
    const cached = readCache(userId, currentYear)
    if (cached) {
      setIncome(
        (cached.income ?? []).map((c) => ({
          ...c,
          type: 'income' as const,
          hasDirectEntries: c.hasDirectEntries ?? false,
        }))
      )
      setExpenses(
        (cached.expense ?? []).map((c) => ({
          ...c,
          type: 'expense' as const,
          hasDirectEntries: c.hasDirectEntries ?? false,
        }))
      )
      setLoading(false)
      dataReadyRef.current = true
    } else {
      dataReadyRef.current = false
    }
    const ctl = new AbortController()
    void loadData(ctl.signal)
    return () => ctl.abort()
  }, [userId, currentYear, readCache, loadData])

  useEffect(() => {
    const onUpdated = () => {
      void loadData()
    }
    window.addEventListener('finance-data-updated', onUpdated)
    return () => window.removeEventListener('finance-data-updated', onUpdated)
  }, [loadData])

  const { pullDistance, refreshing } = usePullToRefresh({
    onRefresh: async () => {
      dataReadyRef.current = true
      await loadData()
    },
    enabled: !loading && !editorOpen && !showAIChat,
  })

  const handlePrevMonth = useCallback(() => {
    hapticSelection()
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }, [currentMonth])

  const handleNextMonth = useCallback(() => {
    hapticSelection()
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }, [currentMonth])

  const openLedger = (type: MoneyType) => {
    hapticLightTap()
    setActiveLedger(type)
  }

  const openCellEditor = (category: Category, monthIndex: number) => {
    const childrenMap = category.type === 'income' ? childrenMapIncome : childrenMapExpense
    if ((childrenMap[category.id] || 0) > 0) return
    hapticLightTap()
    setCurrentMonth(monthIndex)
    setEditorMonth(monthIndex)
    setEditingCategory(category)
    setEditorOpen(true)
  }

  const handleCellUpdate = async (sum: number, hasEntriesInCell: boolean, monthIndex = editorMonth) => {
    if (!editingCategory) return
    const hasDirectEntries = await resolveCategoryHasDirectEntries(
      editingCategory.id,
      currentYear,
      hasEntriesInCell
    )
    const month = monthIndex
    const updateCategories = (cats: Category[]) =>
      cats.map((c) =>
        c.id === editingCategory.id
          ? {
              ...c,
              values: c.values.map((v, i) => (i === month ? sum : v)),
              hasDirectEntries,
            }
          : c
      )
    const updatedCategory = {
      ...editingCategory,
      values: editingCategory.values.map((v, i) => (i === month ? sum : v)),
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

  const toggleCollapse = useCallback((id: string) => {
    hapticLightTap()
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const showSkeleton = loading && !dataReadyRef.current
  const isPullActive = refreshing

  const renderSection = (
    type: MoneyType,
    parents: Category[],
    childrenByParent: Record<string, Category[]>,
    childrenMap: Record<string, number>,
    aggregated: Record<string, number[]>
  ) => {
    if (showSkeleton) {
      return (
        <div className="space-y-2">
          <CategorySkeleton />
          <CategorySkeleton />
        </div>
      )
    }
    if (parents.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
          {type === 'income' ? t('finance.noIncomeCategories') : t('finance.noExpenseCategories')}
          <div className="mt-2 text-xs text-gray-400">{t('finance.categoriesOnDesktop')}</div>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {parents.map((parent, parentIndex) => {
          const kids = childrenByParent[parent.id] || []
          const hasChildren = kids.length > 0
          const isCollapsed = !!collapsed[parent.id]
          return (
            <div
              key={parent.id}
              className="finance-mobile-fade-up"
              style={{ animationDelay: `${Math.min(parentIndex, 8) * 35}ms` }}
            >
              <MobileFinanceCategoryRow
                category={parent}
                amount={getCategoryAmount(parent, currentMonth, childrenMap, aggregated)}
                hasChildren={hasChildren}
                collapsed={isCollapsed}
                formatCurrency={formatCurrency}
                collapseLabel={t('aria.collapse')}
                expandLabel={t('aria.expand')}
                canEdit={!hasChildren}
                onOpenCell={() => openCellEditor(parent, currentMonth)}
                onToggleCollapse={() => toggleCollapse(parent.id)}
              />
              {hasChildren && (
                <div className={cn('finance-mobile-children mt-1.5', !isCollapsed && 'is-open')}>
                  <div className="finance-mobile-children__inner space-y-1.5">
                    {kids.map((child, childIndex) => (
                      <div
                        key={child.id}
                        className="finance-mobile-fade-up"
                        style={{ animationDelay: `${childIndex * 30}ms` }}
                      >
                        <MobileFinanceCategoryRow
                          category={child}
                          amount={getCategoryAmount(child, currentMonth, childrenMap, aggregated)}
                          hasChildren={false}
                          collapsed={false}
                          formatCurrency={formatCurrency}
                          collapseLabel={t('aria.collapse')}
                          expandLabel={t('aria.expand')}
                          canEdit
                          onOpenCell={() => openCellEditor(child, currentMonth)}
                          onToggleCollapse={() => undefined}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <MobileLayout>
      <PullRefreshIndicator distance={pullDistance} refreshing={isPullActive} />

      <div
        className="flex flex-col gap-4 p-4 pb-2 transition-transform duration-150"
        style={{ transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined }}
        onTouchStart={(e) => {
          swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, active: true }
        }}
        onTouchEnd={(e) => {
          if (!swipeRef.current.active) return
          const dx = e.changedTouches[0].clientX - swipeRef.current.x
          const dy = e.changedTouches[0].clientY - swipeRef.current.y
          swipeRef.current.active = false
          if (editorOpen || showAIChat) return
          if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.25) return
          if (dx < 0) handleNextMonth()
          else handlePrevMonth()
        }}
      >
        <div className="flex items-center gap-2">
          {activeLedger && (
            <button
              type="button"
              onClick={() => {
                hapticLightTap()
                setActiveLedger(null)
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 active:bg-gray-50"
              aria-label={t('common.back')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex min-w-0 flex-1 items-center rounded-2xl border border-gray-200 bg-white px-1 py-1 shadow-sm">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 active:bg-gray-100"
              aria-label={t('aria.previousMonth')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 text-center text-sm font-semibold tabular-nums text-gray-900">
              {monthNames[currentMonth]} {currentYear}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 active:bg-gray-100"
              aria-label={t('aria.nextMonth')}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              hapticLightTap()
              setShowAIChat(true)
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white active:bg-black"
            aria-label={t('finance.ai.expand')}
          >
            <Sparkles className="h-5 w-5" />
          </button>
        </div>

        <div className="finance-mobile-hero finance-mobile-fade-up" key={`${currentYear}-${currentMonth}-summary`}>
          {showSkeleton ? (
            <div className="space-y-3">
              <Skeleton variant="text" className="h-4 w-20 bg-white/20" />
              <Skeleton variant="text" className="h-9 w-36 bg-white/20" />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Skeleton variant="rectangular" className="h-16 rounded-2xl bg-white/10" />
                <Skeleton variant="rectangular" className="h-16 rounded-2xl bg-white/10" />
              </div>
            </div>
          ) : (
            <>
              <div className="finance-mobile-hero__label">{t('finance.balance')}</div>
              <div className="finance-mobile-hero__amount">{formatCurrency(monthTotals.balance)}</div>
              <div className="finance-mobile-hero__pills">
                <button type="button" onClick={() => openLedger('income')} className="finance-mobile-hero__pill">
                  <div className="finance-mobile-hero__pill-label">{t('finance.moneyIn')}</div>
                  <div className="finance-mobile-hero__pill-value">{formatCurrency(monthTotals.income)}</div>
                </button>
                <button type="button" onClick={() => openLedger('expense')} className="finance-mobile-hero__pill">
                  <div className="finance-mobile-hero__pill-label">{t('finance.moneyOut')}</div>
                  <div className="finance-mobile-hero__pill-value">{formatCurrency(monthTotals.expenses)}</div>
                </button>
              </div>
            </>
          )}
        </div>

        {!activeLedger ? (
          <div className="space-y-3 pb-4">
            <button
              type="button"
              onClick={() => openLedger('expense')}
              className="finance-mobile-intent finance-mobile-intent--expense"
            >
              <div className="finance-mobile-intent__icon">
                <TrendingDown className="h-6 w-6" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-base font-semibold text-gray-900">{t('finance.recordExpense')}</div>
                <div className="mt-0.5 text-sm text-gray-500">{t('finance.pickExpenseHint')}</div>
              </div>
              <div className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                {formatCurrency(monthTotals.expenses)}
              </div>
            </button>
            <button
              type="button"
              onClick={() => openLedger('income')}
              className="finance-mobile-intent finance-mobile-intent--income"
            >
              <div className="finance-mobile-intent__icon">
                <TrendingUp className="h-6 w-6" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-base font-semibold text-gray-900">{t('finance.recordIncome')}</div>
                <div className="mt-0.5 text-sm text-gray-500">{t('finance.pickIncomeHint')}</div>
              </div>
              <div className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                {formatCurrency(monthTotals.income)}
              </div>
            </button>
          </div>
        ) : (
          <section className="space-y-3 pb-4">
            <div className="text-sm font-semibold text-gray-900">{t('finance.pickCategory')}</div>
            {activeLedger === 'expense'
              ? renderSection('expense', expenseParents, expenseChildrenByParent, childrenMapExpense, aggregatedExpenseByParent)
              : renderSection('income', incomeParents, incomeChildrenByParent, childrenMapIncome, aggregatedIncomeByParent)}
          </section>
        )}
      </div>

      {editorOpen && editingCategory && userId && (
        <MobileCellEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          userId={userId}
          categoryId={editingCategory.id}
          categoryName={editingCategory.name}
          monthIndex={editorMonth}
          year={currentYear}
          monthNames={monthNames}
          onApply={handleCellUpdate}
        />
      )}

      <FinanceChatPanel
        open={showAIChat}
        onClose={() => setShowAIChat(false)}
        year={currentYear}
        income={income}
        expense={expenses}
        fullScreen
        allowWrites
        activeMonthIndex={currentMonth}
        userId={userId}
        onDataChanged={() => {
          void loadData()
        }}
      />
    </MobileLayout>
  )
}

function CategorySkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-4 w-28" />
        <Skeleton variant="text" className="h-4 w-16" />
      </div>
    </div>
  )
}

function PullRefreshIndicator({ distance, refreshing }: { distance: number; refreshing: boolean }) {
  const { t } = useSafeTranslation()
  const visible = refreshing || distance > 8
  return (
    <div
      className={cn(
        'pointer-events-none flex items-center justify-center gap-2 overflow-hidden text-xs font-medium text-gray-500 transition-all duration-200',
        visible ? 'opacity-100' : 'opacity-0 h-0'
      )}
      style={{ height: visible ? Math.max(distance, refreshing ? 36 : 0) : 0 }}
      aria-live="polite"
    >
      <Loader2 className={cn('h-4 w-4', refreshing ? 'animate-spin text-primary' : 'text-gray-400')} />
      {refreshing && <span>{t('actions.refresh')}</span>}
    </div>
  )
}
