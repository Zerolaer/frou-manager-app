import type { FinanceCurrency } from '@/types/shared'

export const FINANCE_SNAPSHOT_VERSION = '1.0' as const

export type FinanceSnapshotEntry = {
  id: string
  amount: number
  currency: FinanceCurrency
  amount_eur: number
  note: string | null
  included: boolean
  position: number
}

export type FinanceSnapshotCell = {
  month: number
  total_eur: number
  entries: FinanceSnapshotEntry[]
}

export type FinanceSnapshotCategory = {
  id: string
  name: string
  type: 'income' | 'expense'
  parent_id: string | null
  parent_name: string | null
  is_leaf: boolean
  has_direct_entries: boolean
  monthly_totals_eur: number[]
  cells?: FinanceSnapshotCell[]
}

export type FinanceSnapshotSummary = {
  income_by_month: number[]
  expense_by_month: number[]
  balance_by_month: number[]
  annual: {
    total_income: number
    total_expense: number
    balance: number
    savings_rate_percent: number
    avg_monthly_income: number
    avg_monthly_expense: number
  }
  best_income_month: number
  best_expense_month: number
  current_month_index: number
}

export type FinanceTemporalContext = {
  today_iso: string
  calendar_year: number
  calendar_month_number: number
  calendar_month_index: number
  calendar_month_name_ru: string
  grid_year: number
  is_grid_current_year: boolean
  /** Month to use when user asks «текущий месяц» (0–11, only if grid year = calendar year) */
  reference_month_index: number
  reference_month_name_ru: string
  reference_month_number: number
  best_income_month_name_ru: string
  best_expense_month_name_ru: string
}

export type FinanceSnapshot = {
  schema_version: typeof FINANCE_SNAPSHOT_VERSION
  year: number
  currency_display: 'EUR'
  generated_at: string
  structure_rules: {
    hierarchy: string
    parent_cells: string
    leaf_cells: string
    entry_fields: string[]
    entry_inclusion: string
    currencies: FinanceCurrency[]
  }
  summary: FinanceSnapshotSummary
  temporal: FinanceTemporalContext
  categories: {
    income: FinanceSnapshotCategory[]
    expense: FinanceSnapshotCategory[]
  }
}

export type FinanceChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type FinanceAIChatRequest = {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  snapshot: FinanceSnapshot
  gridContext?: string
  locale?: string
}

export type FinanceAIChatResponse = {
  message: string
  error?: string
}
