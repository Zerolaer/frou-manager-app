import type { Cat } from '@/features/finance/types'

export const CTX_MENU_W = 192
export const CTX_MENU_H_CAT = 140
export const CTX_MENU_H_CELL = 96

export function clampToViewport(x: number, y: number, w: number, h: number) {
  const pad = 8
  const vw = window.innerWidth, vh = window.innerHeight
  let nx = x, ny = y
  
  // Check if menu would go off the right edge
  if (nx + w > vw - pad) {
    nx = vw - w - pad
  }
  
  // Check if menu would go off the bottom edge
  if (ny + h > vh - pad) {
    ny = vh - h - pad
  }
  
  // Ensure menu doesn't go off the left edge
  if (nx < pad) {
    nx = pad
  }
  
  // Ensure menu doesn't go off the top edge
  if (ny < pad) {
    ny = pad
  }
  
  return { x: nx, y: ny }
}

/**
 * Builds a map: parentId -> aggregated monthly sums of all descendants.
 * Safe to missing/short `values` arrays.
 */
export function computeDescendantSums(list: Cat[]): Record<string, number[]> {
  const months = 12
  const byId: Record<string, Cat> = {}
  const children: Record<string, string[]> = {}

  for (const c of list) {
    byId[c.id] = c
    if (c.parent_id) (children[c.parent_id] ||= []).push(c.id)
  }

  const memo: Record<string, number[]> = {}

  function dfs(id: string): number[] {
    if (!children[id]) return Array(months).fill(0)
    if (memo[id]) return memo[id].slice()
    const out = Array(months).fill(0)
    for (const childId of children[id]) {
      const child = byId[childId]
      if (child) {
        for (let m = 0; m < months; m++) out[m] += child.values?.[m] ?? 0
      }
      const grand = dfs(childId)
      for (let m = 0; m < months; m++) out[m] += grand[m] || 0
    }
    memo[id] = out.slice()
    return out
  }

  const result: Record<string, number[]> = {}
  for (const pid of Object.keys(children)) result[pid] = dfs(pid)
  return result
}

/** Builds a set of category ids that have at least one finance_entries row (any month, included or not). */
export function buildCategoryHasDirectEntries(
  entries: Array<{ category_id: string }>
): Record<string, boolean> {
  const flags: Record<string, boolean> = {}
  for (const e of entries) {
    flags[e.category_id] = true
  }
  return flags
}

/** True when the category has direct cell data: non-zero sums or any stored entries (incl. excluded). */
export function hasDirectCategoryData(category: Pick<Cat, 'values' | 'hasDirectEntries'>): boolean {
  if (category.hasDirectEntries) return true
  return (category.values ?? []).some((v) => v !== 0)
}

/** Parent categories only — blocked when the category already has direct entries/values. */
export function canAddSubcategory(category: Pick<Cat, 'values' | 'parent_id' | 'hasDirectEntries'>): boolean {
  if (category.parent_id) return false
  return !hasDirectCategoryData(category)
}

export function toFinanceCacheCat(c: Pick<Cat, 'id' | 'name' | 'values' | 'parent_id' | 'hasDirectEntries'>) {
  return {
    id: c.id,
    name: c.name,
    values: c.values,
    parent_id: c.parent_id,
    hasDirectEntries: c.hasDirectEntries ?? false,
  }
}

/** Count of direct children per parent category id. */
export function buildChildrenMap(list: Pick<Cat, 'id' | 'parent_id'>[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const c of list) {
    if (c.parent_id) map[c.parent_id] = (map[c.parent_id] || 0) + 1
  }
  return map
}

/** Parents first, then their children (same order as the finance grid). */
export function orderCategories(list: Cat[]): Cat[] {
  const parents = list.filter((c) => !c.parent_id)
  const byParent: Record<string, Cat[]> = {}
  for (const c of list) {
    if (c.parent_id) (byParent[c.parent_id] ||= []).push(c)
  }

  const result: Cat[] = []
  for (const p of parents) {
    result.push(p)
    for (const child of byParent[p.id] || []) result.push(child)
  }

  for (const ch of list) {
    if (ch.parent_id && !parents.some((p) => p.id === ch.parent_id)) {
      result.push(ch)
    }
  }

  return result
}

/** Flat list with `isCollapsed` on children when their parent is collapsed. */
export function applyCollapse(list: Cat[], collapsed: Record<string, boolean>): Cat[] {
  const parents = list.filter((c) => !c.parent_id)
  const byParent: Record<string, Cat[]> = {}
  for (const c of list) {
    if (c.parent_id) (byParent[c.parent_id] ||= []).push(c)
  }

  const result: Cat[] = []
  for (const p of parents) {
    result.push({ ...p, isCollapsed: false })
    for (const child of byParent[p.id] || []) {
      result.push({ ...child, isCollapsed: !!collapsed[p.id] })
    }
  }

  for (const ch of list) {
    if (ch.parent_id && !parents.some((p) => p.id === ch.parent_id)) {
      result.push({ ...ch, isCollapsed: false })
    }
  }

  return result
}

// Month labels & helpers
export const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'] as const
export const monthCount = months.length
export const isCurrentYear = (y: number) => y === new Date().getFullYear()
