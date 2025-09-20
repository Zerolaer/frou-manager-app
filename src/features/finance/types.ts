// Re-export types from shared types for backward compatibility
export type { MoneyType, Cat, CtxCat } from '@/types/shared'

export type { FinanceCellCtx as CellCtx } from '@/types/shared'

export type EntryLite = {
  amount: number
  note: string | null
  included: boolean
  position: number
}
