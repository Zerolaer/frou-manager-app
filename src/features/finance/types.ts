export type MoneyType = 'income' | 'expense'

export type Cat = {
  id: string
  name: string
  type: MoneyType
  values: number[]
  parent_id?: string | null
}

export type CtxCat = {
  id: string
  name: string
  type: MoneyType
}

export type CellCtx = {
  catId: string
  type: MoneyType
  month: number
}

export type EntryLite = {
  amount: number
  note: string | null
  included: boolean
  position: number
}
