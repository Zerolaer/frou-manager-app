import { describe, expect, it } from 'vitest'
import {
  parseFinanceAIPayload,
  resolveCategory,
} from '@/features/finance/ai/actions'
import { buildFinanceAISystemPrompt, buildFinanceAITextContext } from '@/features/finance/ai/context'
import { buildFinanceSnapshotFromState } from '@/features/finance/snapshot'
import type { Cat } from '@/types/shared'

function makeCat(overrides: Partial<Cat> & Pick<Cat, 'id' | 'name' | 'type'>): Cat {
  return {
    values: Array(12).fill(0),
    parent_id: null,
    hasDirectEntries: false,
    ...overrides,
  }
}

function snapshotWithAccounts() {
  const income: Cat[] = [
    makeCat({
      id: 'swed',
      name: 'Swedbank',
      type: 'income',
      values: [600, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hasDirectEntries: true,
    }),
  ]
  const expense: Cat[] = [
    makeCat({
      id: 'extra',
      name: 'Дополнительные',
      type: 'expense',
      values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }),
    makeCat({ id: 'food', name: 'Еда', type: 'expense' }),
  ]
  return buildFinanceSnapshotFromState(income, expense, 2026)
}

describe('parseFinanceAIPayload', () => {
  it('reads reply and actions from JSON', () => {
    const parsed = parseFinanceAIPayload(
      JSON.stringify({
        reply: 'Списал 300 € со Swedbank',
        actions: [{ op: 'set_balance', category_name: 'Swedbank', type: 'income', new_total: 300, month: 1 }],
      })
    )
    expect(parsed.reply).toBe('Списал 300 € со Swedbank')
    expect(parsed.actions).toEqual([
      { op: 'set_balance', category_name: 'Swedbank', type: 'income', new_total: 300, month: 1 },
    ])
  })

  it('extracts JSON from a fenced block', () => {
    const parsed = parseFinanceAIPayload(
      '```json\n{"reply":"Готово","actions":[{"op":"add_entry","category_name":"Дополнительные","amount":300,"note":"телефон"}]}\n```'
    )
    expect(parsed.reply).toBe('Готово')
    expect(parsed.actions[0]).toMatchObject({ op: 'add_entry', amount: 300, note: 'телефон' })
  })

  it('returns plain text when there is no JSON', () => {
    const parsed = parseFinanceAIPayload('Просто анализ')
    expect(parsed.reply).toBe('Просто анализ')
    expect(parsed.actions).toEqual([])
  })
})

describe('resolveCategory', () => {
  it('matches Swedbank by latin and cyrillic names', () => {
    const snapshot = snapshotWithAccounts()
    expect(resolveCategory(snapshot, { category_name: 'сведбанк' })?.id).toBe('swed')
    expect(resolveCategory(snapshot, { category_name: 'Swedbank' })?.id).toBe('swed')
  })

  it('matches additional expenses by partial name', () => {
    const snapshot = snapshotWithAccounts()
    expect(resolveCategory(snapshot, { category_name: 'дополнительные', type: 'expense' })?.id).toBe('extra')
  })

  it('returns null when several categories match equally', () => {
    const snapshot = buildFinanceSnapshotFromState(
      [],
      [makeCat({ id: 'a', name: 'Bank A', type: 'expense' }), makeCat({ id: 'b', name: 'Bank B', type: 'expense' })],
      2026
    )
    expect(resolveCategory(snapshot, { category_name: 'bank' })).toBeNull()
  })
})

describe('buildFinanceAISystemPrompt write mode', () => {
  it('asks for JSON actions and keeps analysis mode read-only', () => {
    const snapshot = snapshotWithAccounts()
    const write = buildFinanceAISystemPrompt(snapshot, { allowWrites: true, activeMonthIndex: 0 })
    expect(write).toContain('ЗАПИСЬ ДАННЫХ')
    expect(write).toContain('set_balance')
    expect(write).toContain('НЕ создавать расход')
    expect(write).toContain('Янв 2026')

    const read = buildFinanceAISystemPrompt(snapshot)
    expect(read).toContain('ТОЛЬКО АНАЛИЗ')
    expect(read).not.toContain('set_balance')

    const text = buildFinanceAITextContext(snapshot, 'ru')
    expect(text).toContain('id:swed')
  })
})
