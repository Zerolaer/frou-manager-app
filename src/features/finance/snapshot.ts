import { supabase } from '@/lib/supabaseClient'
import { FINANCE_TYPES, MONTHS_IN_YEAR } from '@/lib/constants'
import { convertToEUR, initializeExchangeRates } from '@/utils/currency'
import type { Cat, FinanceCurrency } from '@/types/shared'
import {
  buildCategoryHasDirectEntries,
  buildChildrenMap,
  computeDescendantSums,
  orderCategories,
} from '@/features/finance/utils'
import {
  FINANCE_SNAPSHOT_VERSION,
  type FinanceSnapshot,
  type FinanceSnapshotCategory,
  type FinanceSnapshotCell,
  type FinanceSnapshotEntry,
  type FinanceTemporalContext,
} from '@/features/finance/ai/types'

type RawEntry = {
  id: string
  category_id: string
  month: number
  amount: number
  currency: string | null
  note: string | null
  included: boolean
  position: number
}

function monthIndex(month: number): number {
  return Math.min(MONTHS_IN_YEAR - 1, Math.max(0, month - 1))
}

function toSnapshotEntry(row: RawEntry): FinanceSnapshotEntry {
  const currency = (row.currency || 'EUR') as FinanceCurrency
  const amount = Number(row.amount) || 0
  return {
    id: row.id,
    amount,
    currency,
    amount_eur: convertToEUR(amount, currency),
    note: row.note,
    included: !!row.included,
    position: row.position ?? 0,
  }
}

const MONTHS_RU_FULL = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

function buildTemporalContext(
  year: number,
  incomeByMonth: number[],
  expenseByMonth: number[]
): FinanceTemporalContext {
  const now = new Date()
  const calendarMonthIndex = now.getMonth()
  const isGridCurrentYear = year === now.getFullYear()
  const bestIncomeIdx = incomeByMonth.indexOf(Math.max(...incomeByMonth, 0))
  const bestExpenseIdx = expenseByMonth.indexOf(Math.max(...expenseByMonth, 0))

  return {
    today_iso: now.toISOString().slice(0, 10),
    calendar_year: now.getFullYear(),
    calendar_month_number: calendarMonthIndex + 1,
    calendar_month_index: calendarMonthIndex,
    calendar_month_name_ru: MONTHS_RU_FULL[calendarMonthIndex],
    grid_year: year,
    is_grid_current_year: isGridCurrentYear,
    reference_month_index: isGridCurrentYear ? calendarMonthIndex : -1,
    reference_month_name_ru: isGridCurrentYear ? MONTHS_RU_FULL[calendarMonthIndex] : '',
    reference_month_number: isGridCurrentYear ? calendarMonthIndex + 1 : -1,
    best_income_month_name_ru: MONTHS_RU_FULL[bestIncomeIdx] ?? '',
    best_expense_month_name_ru: MONTHS_RU_FULL[bestExpenseIdx] ?? '',
  }
}

function buildSummary(
  incomeByMonth: number[],
  expenseByMonth: number[],
  year: number
): FinanceSnapshot['summary'] {
  const balanceByMonth = incomeByMonth.map((v, i) => v - expenseByMonth[i])
  const totalIncome = incomeByMonth.reduce((s, v) => s + v, 0)
  const totalExpense = expenseByMonth.reduce((s, v) => s + v, 0)
  const balance = totalIncome - totalExpense
  const now = new Date()
  const currentMonthIndex = year === now.getFullYear() ? now.getMonth() : -1

  return {
    income_by_month: incomeByMonth,
    expense_by_month: expenseByMonth,
    balance_by_month: balanceByMonth,
    annual: {
      total_income: totalIncome,
      total_expense: totalExpense,
      balance,
      savings_rate_percent: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
      avg_monthly_income: totalIncome / MONTHS_IN_YEAR,
      avg_monthly_expense: totalExpense / MONTHS_IN_YEAR,
    },
    best_income_month: incomeByMonth.indexOf(Math.max(...incomeByMonth, 0)),
    best_expense_month: expenseByMonth.indexOf(Math.max(...expenseByMonth, 0)),
    current_month_index: currentMonthIndex,
  }
}

function buildCategoryNodes(
  cats: Cat[],
  childrenMap: Record<string, number>,
  aggregatedByParent: Record<string, number[]>,
  entryFlags: Record<string, boolean>,
  entriesByCategoryMonth: Record<string, Record<number, FinanceSnapshotEntry[]>>,
  includeCells: boolean
): FinanceSnapshotCategory[] {
  const nameById = Object.fromEntries(cats.map((c) => [c.id, c.name]))
  const ordered = orderCategories(cats)

  return ordered.map((cat) => {
    const hasChildren = (childrenMap[cat.id] || 0) > 0
    const isLeaf = !hasChildren
    const monthlyTotals = hasChildren
      ? aggregatedByParent[cat.id] ?? Array(MONTHS_IN_YEAR).fill(0)
      : cat.values ?? Array(MONTHS_IN_YEAR).fill(0)

    const node: FinanceSnapshotCategory = {
      id: cat.id,
      name: cat.name,
      type: cat.type,
      parent_id: cat.parent_id ?? null,
      parent_name: cat.parent_id ? nameById[cat.parent_id] ?? null : null,
      is_leaf: isLeaf,
      has_direct_entries: !!entryFlags[cat.id],
      monthly_totals_eur: monthlyTotals,
    }

    if (includeCells && isLeaf) {
      const cells: FinanceSnapshotCell[] = []
      for (let m = 0; m < MONTHS_IN_YEAR; m++) {
        const entries = entriesByCategoryMonth[cat.id]?.[m] ?? []
        if (entries.length === 0 && monthlyTotals[m] === 0) continue
        const totalEur = entries
          .filter((e) => e.included)
          .reduce((s, e) => s + e.amount_eur, 0)
        cells.push({ month: m + 1, total_eur: totalEur, entries })
      }
      if (cells.length > 0) node.cells = cells
    }

    return node
  })
}

function groupEntriesByCategoryMonth(entries: RawEntry[]): Record<string, Record<number, FinanceSnapshotEntry[]>> {
  const map: Record<string, Record<number, FinanceSnapshotEntry[]>> = {}
  for (const row of entries) {
    const catId = row.category_id
    const mi = monthIndex(row.month)
    if (!map[catId]) map[catId] = {}
    if (!map[catId][mi]) map[catId][mi] = []
    map[catId][mi].push(toSnapshotEntry(row))
  }
  for (const catId of Object.keys(map)) {
    for (const mi of Object.keys(map[catId])) {
      map[catId][Number(mi)].sort((a, b) => a.position - b.position)
    }
  }
  return map
}

function catsFromDb(
  cats: Array<{ id: string; name: string; type: string; parent_id: string | null }>,
  entries: Array<{ category_id: string; month: number; amount: number; currency: string | null; included: boolean }>,
  entryFlags: Record<string, boolean>
): { income: Cat[]; expense: Cat[] } {
  const byId: Record<string, number[]> = {}
  for (const c of cats) byId[c.id] = Array(MONTHS_IN_YEAR).fill(0)

  for (const e of entries) {
    if (!e.included) continue
    const i = monthIndex(e.month)
    const id = e.category_id
    if (!byId[id]) byId[id] = Array(MONTHS_IN_YEAR).fill(0)
    const currency = (e.currency || 'EUR') as FinanceCurrency
    byId[id][i] += convertToEUR(Number(e.amount) || 0, currency)
  }

  const income = cats
    .filter((c) => c.type === FINANCE_TYPES.INCOME)
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: 'income' as const,
      parent_id: c.parent_id,
      values: byId[c.id] ?? Array(MONTHS_IN_YEAR).fill(0),
      hasDirectEntries: !!entryFlags[c.id],
    }))

  const expense = cats
    .filter((c) => c.type === FINANCE_TYPES.EXPENSE)
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: 'expense' as const,
      parent_id: c.parent_id,
      values: byId[c.id] ?? Array(MONTHS_IN_YEAR).fill(0),
      hasDirectEntries: !!entryFlags[c.id],
    }))

  return { income, expense }
}

function assembleSnapshot(
  year: number,
  income: Cat[],
  expense: Cat[],
  entryFlags: Record<string, boolean>,
  entriesByCategoryMonth: Record<string, Record<number, FinanceSnapshotEntry[]>>,
  includeCells: boolean
): FinanceSnapshot {
  const incomeByMonth = Array.from({ length: MONTHS_IN_YEAR }, (_, i) =>
    income.reduce((s, c) => s + (c.values?.[i] ?? 0), 0)
  )
  const expenseByMonth = Array.from({ length: MONTHS_IN_YEAR }, (_, i) =>
    expense.reduce((s, c) => s + (c.values?.[i] ?? 0), 0)
  )

  const childrenMapIncome = buildChildrenMap(income)
  const childrenMapExpense = buildChildrenMap(expense)
  const aggregatedIncome = computeDescendantSums(income)
  const aggregatedExpense = computeDescendantSums(expense)

  return {
    schema_version: FINANCE_SNAPSHOT_VERSION,
    year,
    currency_display: 'EUR',
    generated_at: new Date().toISOString(),
    structure_rules: {
      hierarchy: 'parent → child (max 2 levels)',
      parent_cells: 'read-only aggregates of children — do not edit directly',
      leaf_cells: 'editable — contain multiple entries with amount, currency, note, included (checkbox)',
      entry_fields: ['amount', 'currency', 'note', 'included', 'position'],
      entry_inclusion:
        'included=true (checkbox on) = open entry, counts in cell/month/year totals; included=false (checkbox off) = closed entry, excluded from all totals',
      currencies: ['EUR', 'USD', 'GEL'],
    },
    summary: buildSummary(incomeByMonth, expenseByMonth, year),
    temporal: buildTemporalContext(year, incomeByMonth, expenseByMonth),
    categories: {
      income: buildCategoryNodes(
        income,
        childrenMapIncome,
        aggregatedIncome,
        entryFlags,
        entriesByCategoryMonth,
        includeCells
      ),
      expense: buildCategoryNodes(
        expense,
        childrenMapExpense,
        aggregatedExpense,
        entryFlags,
        entriesByCategoryMonth,
        includeCells
      ),
    },
  }
}

/** Build snapshot from in-memory Finance page state (read-only, no extra DB calls). */
export function buildFinanceSnapshotFromState(
  income: Cat[],
  expense: Cat[],
  year: number,
  options?: { includeCells?: boolean }
): FinanceSnapshot {
  const entryFlags: Record<string, boolean> = {}
  for (const c of [...income, ...expense]) {
    if (c.hasDirectEntries) entryFlags[c.id] = true
  }
  return assembleSnapshot(year, income, expense, entryFlags, {}, options?.includeCells ?? false)
}

/** Fetch full finance snapshot from Supabase for AI analysis (read-only). */
export async function fetchFinanceSnapshotForAI(
  year: number,
  options?: { includeCells?: boolean; income?: Cat[]; expense?: Cat[] }
): Promise<FinanceSnapshot> {
  const includeCells = options?.includeCells ?? true
  await initializeExchangeRates()

  const entriesRes = await supabase
    .from('finance_entries')
    .select('id,category_id,month,amount,currency,note,included,position')
    .eq('year', year)
    .order('position', { ascending: true })

  if (entriesRes.error) throw new Error(entriesRes.error.message)

  const allEntries = (entriesRes.data ?? []) as RawEntry[]
  const entryFlags = buildCategoryHasDirectEntries(allEntries)
  const entriesByCategoryMonth = includeCells ? groupEntriesByCategoryMonth(allEntries) : {}

  // Prefer live grid state from Finance page (matches what the user sees)
  if (options?.income && options?.expense) {
    return assembleSnapshot(year, options.income, options.expense, entryFlags, entriesByCategoryMonth, includeCells)
  }

  const catsRes = await supabase
    .from('finance_categories')
    .select('id,name,type,parent_id')
    .order('created_at', { ascending: true })

  if (catsRes.error) throw new Error(catsRes.error.message)

  const cats = catsRes.data ?? []
  const { income, expense } = catsFromDb(cats, allEntries, entryFlags)

  return assembleSnapshot(year, income, expense, entryFlags, entriesByCategoryMonth, includeCells)
}
