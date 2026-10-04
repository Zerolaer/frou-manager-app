export type PortSide = 'n' | 'e' | 's' | 'w'

/** Обводка и шапка карточки; по умолчанию нейтральная «бумага» */
export type CanvasCardAccent = 'default' | 'red' | 'blue' | 'green'

/** card = note card, sticky = sticky note, shape = rectangle frame, text = free text */
export type CanvasNodeKind = 'card' | 'sticky' | 'shape' | 'text'

export type CanvasNode = {
  id: string
  title: string
  x: number
  y: number
  w: number
  h: number
  text: string
  accent?: CanvasCardAccent
  kind?: CanvasNodeKind
}

export type CanvasEdge = {
  id: string
  from: string
  to: string
  fromSide?: PortSide
  toSide?: PortSide
}

export type CanvasViewport = { tx: number; ty: number; scale: number }

/** Визуальная группа карточек (секция); узел не более чем в одной секции */
export type CanvasSection = {
  id: string
  title?: string
  nodeIds: string[]
}

/** Состояние одной доски — сохраняется в Supabase как JSON */
export type CanvasBoardState = {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  viewport: CanvasViewport
  sections?: CanvasSection[]
}

export type CanvasProjectRow = {
  id: string
  user_id: string
  name: string
  board_state: CanvasBoardState
  created_at: string
  updated_at: string
}

export function isPortSide(v: unknown): v is PortSide {
  return v === 'n' || v === 'e' || v === 's' || v === 'w'
}

export function isCanvasCardAccent(v: unknown): v is CanvasCardAccent {
  return v === 'default' || v === 'red' || v === 'blue' || v === 'green'
}

export function isCanvasNodeKind(v: unknown): v is CanvasNodeKind {
  return v === 'card' || v === 'sticky' || v === 'shape' || v === 'text'
}

export function nodeKindOf(n: Pick<CanvasNode, 'kind'> | CanvasNodeKind | undefined): CanvasNodeKind {
  if (typeof n === 'string') return isCanvasNodeKind(n) ? n : 'card'
  return isCanvasNodeKind(n?.kind) ? n.kind : 'card'
}

export function defaultNodeSize(kind: CanvasNodeKind): { w: number; h: number } {
  switch (kind) {
    case 'sticky':
      return { w: 180, h: 180 }
    case 'shape':
      return { w: 220, h: 160 }
    case 'text':
      return { w: 220, h: 64 }
    default:
      return { w: DEFAULT_W, h: DEFAULT_H }
  }
}

export function minNodeSize(kind: CanvasNodeKind): { w: number; h: number } {
  switch (kind) {
    case 'text':
      return { w: 120, h: 40 }
    case 'sticky':
      return { w: 140, h: 120 }
    default:
      return { w: 160, h: 80 }
  }
}

function normalizeAccent(raw: unknown): CanvasCardAccent | undefined {
  if (raw === undefined || raw === null) return undefined
  return isCanvasCardAccent(raw) ? raw : undefined
}

const DEFAULT_W = 240
const DEFAULT_H = 160

export function defaultBoardState(): CanvasBoardState {
  return {
    nodes: [],
    edges: [],
    viewport: { tx: 80, ty: 72, scale: 1 },
    sections: [],
  }
}

export function normalizeBoardState(raw: unknown): CanvasBoardState {
  if (!raw || typeof raw !== 'object') return defaultBoardState()
  const p = raw as Partial<CanvasBoardState>
  if (!Array.isArray(p.nodes)) return defaultBoardState()
  return {
    nodes: p.nodes.map((n) => {
      const entry = n as Record<string, unknown>
      const accent = normalizeAccent(entry.accent)
      const kind = nodeKindOf(entry.kind as CanvasNodeKind | undefined)
      const min = minNodeSize(kind)
      const fallback = defaultNodeSize(kind)
      return {
        id: String(entry.id),
        title: typeof entry.title === 'string' ? entry.title : '',
        x: Number(entry.x) || 0,
        y: Number(entry.y) || 0,
        w: Math.max(min.w, Number(entry.w) || fallback.w),
        h: Math.max(min.h, Number(entry.h) || fallback.h),
        text: typeof entry.text === 'string' ? entry.text : '',
        kind,
        ...(accent ? { accent } : {}),
      }
    }),
    edges: Array.isArray(p.edges)
      ? p.edges.map((e) => ({
          id: String((e as CanvasEdge).id),
          from: String((e as CanvasEdge).from),
          to: String((e as CanvasEdge).to),
          fromSide: isPortSide((e as CanvasEdge).fromSide)
            ? (e as CanvasEdge).fromSide
            : undefined,
          toSide: isPortSide((e as CanvasEdge).toSide)
            ? (e as CanvasEdge).toSide
            : undefined,
        }))
      : [],
    sections: Array.isArray(p.sections)
      ? (p.sections as unknown[])
          .map((raw) => {
            const entry = raw as Record<string, unknown>
            const rawIds = Array.isArray(entry.nodeIds) ? entry.nodeIds : []
            const seen = new Set<string>()
            const nodeIds: string[] = []
            for (const id of rawIds) {
              const sid = String(id)
              if (seen.has(sid)) continue
              seen.add(sid)
              nodeIds.push(sid)
            }
            const sectionId =
              typeof entry.id === 'string' && entry.id
                ? entry.id
                : `sec_${Math.random().toString(36).slice(2, 12)}`
            return {
              id: sectionId,
              title:
                typeof entry.title === 'string' ? entry.title : undefined,
              nodeIds,
            } satisfies CanvasSection
          })
          .filter((s) => s.nodeIds.length >= 2)
      : [],
    viewport:
      p.viewport &&
      typeof p.viewport.tx === 'number' &&
      typeof p.viewport.ty === 'number' &&
      typeof p.viewport.scale === 'number'
        ? {
            tx: p.viewport.tx,
            ty: p.viewport.ty,
            scale: Math.min(2.5, Math.max(0.25, p.viewport.scale)),
          }
        : defaultBoardState().viewport,
  }
}
