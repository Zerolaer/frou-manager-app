import { describe, it, expect } from 'vitest'
import { buildFinanceAITextContext } from '@/features/finance/ai/context'
import { buildFinanceSnapshotFromState } from '@/features/finance/snapshot'
import type { FinanceSnapshot } from '@/features/finance/ai/types'
import type { Cat } from '@/types/shared'

function makeCat(overrides: Partial<Cat> & Pick<Cat, 'id' | 'name' | 'type'>): Cat {
  return {
    values: Array(12).fill(0),
    parent_id: null,
    hasDirectEntries: false,
    ...overrides,
  }
}

function makeSnapshotWithCells(): FinanceSnapshot {
  const base = buildFinanceSnapshotFromState(
    [],
    [makeCat({ id: 'e1', name: 'Еда', type: 'expense', values: [500, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], hasDirectEntries: true })],
    2026
  )
  const food = base.categories.expense[0]
  food.cells = [
    {
      month: 1,
      total_eur: 500,
      entries: [
        { id: 'a', amount: 300, currency: 'EUR', amount_eur: 300, note: 'магазин', included: true, position: 0 },
        { id: 'b', amount: 200, currency: 'EUR', amount_eur: 200, note: 'старое', included: false, position: 1 },
      ],
    },
  ]
  return base
}

describe('buildFinanceAITextContext', () => {
  it('includes all income and expense categories with all months', () => {
    const income: Cat[] = [
      makeCat({ id: 'i1', name: 'Зарплата', type: 'income', values: [1000, 2000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }),
      makeCat({ id: 'i2', name: 'Фриланс', type: 'income', values: [500, 0, 300, 0, 0, 0, 0, 0, 0, 0, 0, 0] }),
    ]
    const expense: Cat[] = [
      makeCat({ id: 'e1', name: 'Еда', type: 'expense', values: [300, 400, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }),
      makeCat({ id: 'e2', name: 'Аренда', type: 'expense', values: [800, 800, 800, 0, 0, 0, 0, 0, 0, 0, 0, 0] }),
    ]

    const snapshot = buildFinanceSnapshotFromState(income, expense, 2026)
    const text = buildFinanceAITextContext(snapshot, 'ru')

    expect(text).toContain('ДОХОДЫ')
    expect(text).toContain('РАСХОДЫ')
    expect(text).toContain('Зарплата')
    expect(text).toContain('Фриланс')
    expect(text).toContain('Еда')
    expect(text).toContain('Аренда')
    expect(text).toContain('Янв')
    expect(text).toContain('Фев')
  })

  it('explains checkbox inclusion rules and separates open vs closed entries', () => {
    const text = buildFinanceAITextContext(makeSnapshotWithCells(), 'ru')

    expect(text).toContain('ЗАПИСИ В ЯЧЕЙКАХ (ЧЕКБОКС)')
    expect(text).toContain('included=true')
    expect(text).toContain('included=false')
    expect(text).toContain('итого €500 (только открытые)')
    expect(text).toContain('[открыто ✓] €300 «магазин»')
    expect(text).toContain('закрытые (не учитывать)')
    expect(text).toContain('[закрыто ✗] €200 «старое»')
    expect(text).not.toContain('[исключено]')
  })
})
