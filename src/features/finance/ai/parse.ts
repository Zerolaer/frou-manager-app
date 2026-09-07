export type FinanceAIAction = {
  op: 'add_entry' | 'set_balance'
  category_id?: string
  category_name?: string
  type?: 'income' | 'expense'
  month?: number
  amount?: number
  new_total?: number
  currency?: 'EUR' | 'USD' | 'GEL'
  note?: string | null
}

export type FinanceAIParsed = {
  reply: string
  actions: FinanceAIAction[]
}

const CURRENCIES = new Set(['EUR', 'USD', 'GEL'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseOp(value: unknown): FinanceAIAction['op'] | null {
  return value === 'add_entry' || value === 'set_balance' ? value : null
}

function parseAction(raw: unknown): FinanceAIAction | null {
  if (!isRecord(raw)) return null
  const op = parseOp(raw.op)
  if (!op) return null

  const action: FinanceAIAction = { op }
  if (typeof raw.category_id === 'string' && raw.category_id.trim()) {
    action.category_id = raw.category_id.trim()
  }
  if (typeof raw.category_name === 'string' && raw.category_name.trim()) {
    action.category_name = raw.category_name.trim()
  }
  if (raw.type === 'income' || raw.type === 'expense') action.type = raw.type
  if (typeof raw.month === 'number' && Number.isFinite(raw.month)) {
    const month = Math.round(raw.month)
    if (month >= 1 && month <= 12) action.month = month
  }
  if (typeof raw.amount === 'number' && Number.isFinite(raw.amount)) action.amount = raw.amount
  if (typeof raw.new_total === 'number' && Number.isFinite(raw.new_total)) action.new_total = raw.new_total
  if (typeof raw.currency === 'string' && CURRENCIES.has(raw.currency.toUpperCase())) {
    action.currency = raw.currency.toUpperCase() as 'EUR' | 'USD' | 'GEL'
  }
  if (raw.note === null) action.note = null
  else if (typeof raw.note === 'string') action.note = raw.note.trim() || null
  return action
}

function extractJsonObject(raw: string): unknown | null {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidates = [fenced?.[1]?.trim(), trimmed].filter(Boolean) as string[]

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      /* try brace slice */
    }
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1))
      } catch {
        /* not json */
      }
    }
  }
  return null
}

export function parseFinanceAIPayload(raw: string): FinanceAIParsed {
  const parsed = extractJsonObject(raw)
  if (isRecord(parsed)) {
    const reply = String(parsed.reply ?? parsed.message ?? parsed.text ?? '').trim()
    const list = Array.isArray(parsed.actions)
      ? parsed.actions
      : parsed.action
        ? [parsed.action]
        : []
    const actions = list.map(parseAction).filter((action): action is FinanceAIAction => !!action)
    if (reply || actions.length) {
      return { reply: reply || 'Готово.', actions }
    }
  }
  return { reply: raw.trim(), actions: [] }
}
