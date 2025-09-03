import type { Cat } from '@/features/finance/types'

export const CTX_MENU_W = 192
export const CTX_MENU_H_CAT = 140
export const CTX_MENU_H_CELL = 96

export function clampToViewport(x: number, y: number, w: number, h: number) {
  const pad = 8
  const vw = window.innerWidth, vh = window.innerHeight
  let nx = x, ny = y
  if (nx + w + pad > vw) nx = Math.max(pad, vw - w - pad)
  if (ny + h + pad > vh) ny = Math.max(pad, vh - h - pad)
  if (nx < pad) nx = pad
  if (ny < pad) ny = pad
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

// Month labels & helpers
export const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'] as const
export const monthCount = months.length
export const isCurrentYear = (y: number) => y === new Date().getFullYear()
