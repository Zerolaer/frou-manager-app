import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/lib/monitoring'
import type { FinanceSnapshot, FinanceSnapshotCategory } from '@/features/finance/ai/types'
import type { FinanceAIAction } from '@/features/finance/ai/parse'

export type { FinanceAIAction, FinanceAIParsed } from '@/features/finance/ai/parse'
export { parseFinanceAIPayload } from '@/features/finance/ai/parse'

export type ApplyFinanceAIResult = {
  applied: string[]
  errors: string[]
}

const CYR_TO_LAT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

export function normalizeCategoryKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, '')
}

export function transliterateCategoryKey(value: string): string {
  return [...normalizeCategoryKey(value)]
    .map((ch) => CYR_TO_LAT[ch] ?? ch)
    .join('')
    .replace(/w/g, 'v')
}

function allCategories(snapshot: FinanceSnapshot): FinanceSnapshotCategory[] {
  return [...snapshot.categories.income, ...snapshot.categories.expense]
}

export function resolveCategory(
  snapshot: FinanceSnapshot,
  action: Pick<FinanceAIAction, 'category_id' | 'category_name' | 'type'>
): FinanceSnapshotCategory | null {
  const leaves = allCategories(snapshot).filter((cat) => cat.is_leaf)

  if (action.category_id) {
    const byId = leaves.find((cat) => cat.id === action.category_id)
    if (byId) return byId
  }

  const name = action.category_name?.trim()
  if (!name) return null

  let pool = leaves
  if (action.type) {
    const typed = pool.filter((cat) => cat.type === action.type)
    if (typed.length) pool = typed
  }

  const query = normalizeCategoryKey(name)
  const queryLatin = transliterateCategoryKey(name)
  if (!query && !queryLatin) return null

  const score = (cat: FinanceSnapshotCategory) => {
    const key = normalizeCategoryKey(cat.name)
    const latin = transliterateCategoryKey(cat.name)
    if (key === query || latin === queryLatin) return 3
    if (key.includes(query) || query.includes(key) || latin.includes(queryLatin) || queryLatin.includes(latin)) {
      return 2
    }
    return 0
  }

  const ranked = pool
    .map((cat) => ({ cat, score: score(cat) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  if (!ranked.length) return null
  if (ranked.length === 1 || ranked[0].score > ranked[1].score) return ranked[0].cat
  return null
}

function resolveMonth(action: FinanceAIAction, activeMonthIndex: number): number {
  if (action.month) return action.month
  return Math.min(12, Math.max(1, activeMonthIndex + 1))
}

async function nextPosition(userId: string, categoryId: string, year: number, month: number): Promise<number> {
  const { count, error } = await supabase
    .from('finance_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .eq('year', year)
    .eq('month', month)
  if (error) {
    logger.error('Failed to count finance entries for AI write', error)
    return Date.now() % 1000
  }
  return count ?? 0
}

async function insertEntry(opts: {
  userId: string
  categoryId: string
  year: number
  month: number
  amount: number
  currency: 'EUR' | 'USD' | 'GEL'
  note: string | null
}): Promise<void> {
  const position = await nextPosition(opts.userId, opts.categoryId, opts.year, opts.month)
  const { error } = await supabase.from('finance_entries').insert({
    user_id: opts.userId,
    category_id: opts.categoryId,
    year: opts.year,
    month: opts.month,
    amount: opts.amount,
    currency: opts.currency,
    note: opts.note,
    included: true,
    position,
  })
  if (error) throw error
}

function cellTotal(category: FinanceSnapshotCategory, monthIndex: number): number {
  return category.monthly_totals_eur[monthIndex] ?? 0
}

export async function applyFinanceAIActions(opts: {
  userId: string
  year: number
  activeMonthIndex: number
  snapshot: FinanceSnapshot
  actions: FinanceAIAction[]
}): Promise<ApplyFinanceAIResult> {
  const applied: string[] = []
  const errors: string[] = []
  const balanceKeys = new Set(
    opts.actions
      .filter((action) => action.op === 'set_balance')
      .map((action) => {
        const category = resolveCategory(opts.snapshot, action)
        if (!category) return ''
        return `${category.id}:${resolveMonth(action, opts.activeMonthIndex)}`
      })
      .filter(Boolean)
  )
  const seenBalanceKeys = new Set<string>()

  for (const action of opts.actions) {
    const category = resolveCategory(opts.snapshot, action)
    if (!category) {
      errors.push(
        `Не нашёл категорию «${action.category_name || action.category_id || '—'}». Уточните название.`
      )
      continue
    }
    if (!category.is_leaf) {
      errors.push(`«${category.name}» — родительская категория, в неё писать нельзя.`)
      continue
    }

    const month = resolveMonth(action, opts.activeMonthIndex)
    const monthIndex = month - 1
    const currency = action.currency || 'EUR'
    const key = `${category.id}:${month}`

    try {
      if (action.op === 'set_balance') {
        if (typeof action.new_total !== 'number') {
          errors.push(`Для «${category.name}» не указан новый остаток.`)
          continue
        }
        const current = cellTotal(category, monthIndex)
        const delta = Math.round((action.new_total - current) * 100) / 100
        if (Math.abs(delta) < 0.005) {
          applied.push(`${category.name}: остаток уже €${action.new_total}`)
          seenBalanceKeys.add(key)
          continue
        }
        await insertEntry({
          userId: opts.userId,
          categoryId: category.id,
          year: opts.year,
          month,
          amount: delta,
          currency,
          note: action.note ?? 'корректировка баланса',
        })
        category.monthly_totals_eur[monthIndex] = action.new_total
        seenBalanceKeys.add(key)
        applied.push(`${category.name}: остаток €${current} → €${action.new_total}`)
        continue
      }

      if (typeof action.amount !== 'number' || action.amount === 0) {
        errors.push(`Для «${category.name}» не указана сумма записи.`)
        continue
      }
      if (seenBalanceKeys.has(key) || balanceKeys.has(key)) continue

      await insertEntry({
        userId: opts.userId,
        categoryId: category.id,
        year: opts.year,
        month,
        amount: action.amount,
        currency,
        note: action.note ?? null,
      })
      category.monthly_totals_eur[monthIndex] = cellTotal(category, monthIndex) + action.amount
      applied.push(
        `${category.name}: ${action.amount > 0 ? '+' : ''}€${action.amount}${action.note ? ` «${action.note}»` : ''}`
      )
    } catch (error) {
      logger.error('Failed to apply finance AI action', error)
      errors.push(`Не удалось обновить «${category.name}».`)
    }
  }

  if (applied.length) {
    window.dispatchEvent(new CustomEvent('finance-data-updated'))
  }

  return { applied, errors }
}
