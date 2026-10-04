import {
  isCanvasCardAccent,
  isCanvasNodeKind,
  isPortSide,
  type CanvasCardAccent,
  type CanvasNodeKind,
  type PortSide,
} from '../types'

export const CANVAS_AI_LIMITS = {
  maxColumns: 8,
  maxCards: 40,
  maxEdges: 20,
  maxTitle: 120,
  maxText: 2000,
  maxReply: 2000,
  maxProjectName: 120,
  maxId: 64,
} as const

export type CanvasAiCard = {
  id: string
  kind: CanvasNodeKind
  title: string
  text: string
  accent?: CanvasCardAccent
}

export type CanvasAiColumn = {
  id: string
  title: string
  cards: CanvasAiCard[]
}

export type CanvasAiEdge = {
  from: string
  to: string
  fromSide?: PortSide
  toSide?: PortSide
}

export type CanvasAiLayout = {
  reply: string
  projectName: string
  columns: CanvasAiColumn[]
  edges: CanvasAiEdge[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function tryParseJson(text: string): unknown | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return null
  }
}

/** Close truncated JSON objects/arrays from json_object responses that hit max_tokens. */
function tryRepairTruncatedJson(raw: string): unknown | null {
  let text = raw.trim()
  if (!text || text[0] !== '{') return null
  let inString = false
  let escape = false
  const stack: string[] = []
  for (const ch of text) {
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if (ch === '}' || ch === ']') stack.pop()
  }
  if (inString) text += '"'
  text = text.replace(/,\s*$/, '')
  while (stack.length) text += stack.pop()
  return tryParseJson(text)
}

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const fromFence = fenced?.[1]?.trim() ? tryParseJson(fenced[1].trim()) : null
  if (fromFence != null) return fromFence
  const direct = tryParseJson(trimmed)
  if (direct != null) return direct
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    const sliced = tryParseJson(trimmed.slice(start, end + 1))
    if (sliced != null) return sliced
  }
  if (start >= 0) return tryRepairTruncatedJson(trimmed.slice(start))
  return null
}

function slugId(raw: unknown, fallback: string, used: Set<string>): string {
  const base =
    typeof raw === 'string'
      ? raw
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, CANVAS_AI_LIMITS.maxId)
      : ''
  let id = base || fallback
  let n = 1
  while (used.has(id)) {
    const suffix = `_${n++}`
    id = `${(base || fallback).slice(0, CANVAS_AI_LIMITS.maxId - suffix.length)}${suffix}`
  }
  used.add(id)
  return id
}

function clip(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

/**
 * Normalizes model JSON: unique ids, caps, edges only between existing card ids.
 */
export function parseCanvasAiLayout(raw: unknown): CanvasAiLayout | null {
  const obj = isRecord(raw) ? raw : null
  if (!obj) return null

  const usedIds = new Set<string>()
  const idMap = new Map<string, string>()
  const columns: CanvasAiColumn[] = []
  let cardCount = 0

  const rawColumns = Array.isArray(obj.columns) ? obj.columns : []
  for (const colRaw of rawColumns) {
    if (columns.length >= CANVAS_AI_LIMITS.maxColumns) break
    if (!isRecord(colRaw)) continue
    const rawCards = Array.isArray(colRaw.cards) ? colRaw.cards : []
    const cards: CanvasAiCard[] = []
    for (const cardRaw of rawCards) {
      if (cardCount >= CANVAS_AI_LIMITS.maxCards) break
      if (!isRecord(cardRaw)) continue
      const originalId = typeof cardRaw.id === 'string' ? cardRaw.id.trim() : ''
      const id = slugId(
        originalId || `card_${cardCount + 1}`,
        `card_${cardCount + 1}`,
        usedIds
      )
      if (originalId) idMap.set(originalId, id)
      idMap.set(id, id)
      const kind = isCanvasNodeKind(cardRaw.kind) ? cardRaw.kind : 'card'
      const accent = isCanvasCardAccent(cardRaw.accent) ? cardRaw.accent : undefined
      const title = clip(cardRaw.title, CANVAS_AI_LIMITS.maxTitle) || 'Card'
      const text = clip(cardRaw.text, CANVAS_AI_LIMITS.maxText)
      cards.push({ id, kind, title, text, ...(accent ? { accent } : {}) })
      cardCount += 1
    }
    if (cards.length === 0) continue
    const originalColId = typeof colRaw.id === 'string' ? colRaw.id.trim() : ''
    const colId = slugId(originalColId || `col_${columns.length + 1}`, `col_${columns.length + 1}`, usedIds)
    columns.push({
      id: colId,
      title: clip(colRaw.title, CANVAS_AI_LIMITS.maxTitle) || `Column ${columns.length + 1}`,
      cards,
    })
  }

  if (columns.length === 0 || cardCount === 0) return null

  const knownCards = new Set(columns.flatMap((c) => c.cards.map((card) => card.id)))
  const edges: CanvasAiEdge[] = []
  const edgeKeys = new Set<string>()
  const rawEdges = Array.isArray(obj.edges) ? obj.edges : []
  for (const edgeRaw of rawEdges) {
    if (edges.length >= CANVAS_AI_LIMITS.maxEdges) break
    if (!isRecord(edgeRaw)) continue
    const fromRaw = typeof edgeRaw.from === 'string' ? edgeRaw.from.trim() : ''
    const toRaw = typeof edgeRaw.to === 'string' ? edgeRaw.to.trim() : ''
    const from = idMap.get(fromRaw) ?? fromRaw
    const to = idMap.get(toRaw) ?? toRaw
    if (!knownCards.has(from) || !knownCards.has(to) || from === to) continue
    const key = `${from}->${to}`
    if (edgeKeys.has(key)) continue
    edgeKeys.add(key)
    edges.push({
      from,
      to,
      fromSide: isPortSide(edgeRaw.fromSide) ? edgeRaw.fromSide : 'e',
      toSide: isPortSide(edgeRaw.toSide) ? edgeRaw.toSide : 'w',
    })
  }

  return {
    reply: clip(obj.reply ?? obj.message, CANVAS_AI_LIMITS.maxReply) || 'Готово.',
    projectName: clip(obj.projectName, CANVAS_AI_LIMITS.maxProjectName),
    columns,
    edges,
  }
}

export function parseCanvasAiLayoutFromModelText(raw: string): CanvasAiLayout | null {
  return parseCanvasAiLayout(extractJsonObject(raw))
}
