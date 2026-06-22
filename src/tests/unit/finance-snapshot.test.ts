import { describe, it, expect } from 'vitest'
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

describe('buildFinanceSnapshotFromState', () => {
  it('builds summary and category hierarchy', () => {
    const income: Cat[] = [
      makeCat({ id: 'inc-parent', name: 'Salary', type: 'income', values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }),
      makeCat({
        id: 'inc-child',
        name: 'Freelance',
        type: 'income',
        parent_id: 'inc-parent',
        values: [1000, 2000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        hasDirectEntries: true,
      }),
    ]
    const expense: Cat[] = [
      makeCat({
        id: 'exp-food',
        name: 'Food',
        type: 'expense',
        values: [300, 400, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        hasDirectEntries: true,
      }),
    ]

    const snapshot = buildFinanceSnapshotFromState(income, expense, 2026)

    expect(snapshot.schema_version).toBe('1.0')
    expect(snapshot.year).toBe(2026)
    expect(snapshot.summary.income_by_month[0]).toBe(1000)
    expect(snapshot.summary.income_by_month[1]).toBe(2000)
    expect(snapshot.summary.expense_by_month[0]).toBe(300)
    expect(snapshot.summary.annual.total_income).toBe(3000)
    expect(snapshot.summary.annual.total_expense).toBe(700)

    const parent = snapshot.categories.income.find((c) => c.id === 'inc-parent')
    expect(parent?.is_leaf).toBe(false)
    expect(parent?.monthly_totals_eur[0]).toBe(1000)

    const child = snapshot.categories.income.find((c) => c.id === 'inc-child')
    expect(child?.is_leaf).toBe(true)
    expect(child?.parent_name).toBe('Salary')
  })

  it('documents entry inclusion rules in structure_rules', () => {
    const snapshot = buildFinanceSnapshotFromState([], [], 2026)
    expect(snapshot.structure_rules.entry_inclusion).toContain('included=true')
    expect(snapshot.structure_rules.entry_inclusion).toContain('included=false')
  })
})
