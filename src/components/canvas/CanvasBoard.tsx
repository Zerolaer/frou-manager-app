import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Focus,
  GripHorizontal,
  Group,
  Plus,
  Redo2,
  Scan,
  Undo2,
  Ungroup,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import {
  isPortSide,
  type CanvasBoardState,
  type CanvasCardAccent,
  type CanvasEdge,
  type CanvasNode,
  type CanvasSection,
  type CanvasViewport,
  type PortSide,
} from '@/features/canvas/types'

const CARD_ACCENTS: CanvasCardAccent[] = ['default', 'red', 'blue', 'green']
import {
  cloneBoardSnapshot,
  MAX_BOARD_HISTORY,
  type BoardHistorySnapshot,
} from '@/features/canvas/history'
import '@/canvas.css'

/** Порог в px: меньше — считаем тапом, больше — начинаем перетаскивание карточки */
const CARD_DRAG_THRESHOLD_SQ = 8 * 8

/** Диапазон масштаба доски (колесо, fit, кнопки зума) */
const CANVAS_SCALE_MIN = 0.25
const CANVAS_SCALE_MAX = 2.5
/** Один шаг кнопок + / − */
const CANVAS_ZOOM_STEP = 1.12

/** Движение мыши по пустому месту — начать рамку выделения (не панораму) */
const MARQUEE_THRESHOLD_SQ = 6 * 6

type Viewport = CanvasViewport

type EdgeDraftNew = {
  kind: 'new'
  fromId: string
  fromSide: PortSide
  pointerId: number
}

type EdgeDraftReconnect = {
  kind: 'reconnect'
  edgeId: string
  movingEnd: 'from' | 'to'
  pointerId: number
  anchorFromId: string
  anchorFromSide: PortSide
  anchorToId: string
  anchorToSide: PortSide
}

type EdgeDraft = EdgeDraftNew | EdgeDraftReconnect

export type CanvasBoardProps = {
  projectId: string
  initialBoard: CanvasBoardState
  onPersist: (projectId: string, state: CanvasBoardState) => void
}

const DEFAULT_W = 240
const DEFAULT_H = 160

/** Минимальная высота области текста в карточке (px), совпадает с min-height в CSS */
const CARD_BODY_TEXTAREA_MIN = 72

/** Верх + низ border у .canvas-node */
const CARD_NODE_BORDER_Y = 2

function measureCanvasCardHeightPx(textarea: HTMLTextAreaElement): number {
  const nodeRoot = textarea.closest('.canvas-node')
  const header = nodeRoot?.querySelector<HTMLElement>('[data-card-header]')
  textarea.style.height = 'auto'
  const bodyH = Math.max(CARD_BODY_TEXTAREA_MIN, textarea.scrollHeight)
  textarea.style.height = `${bodyH}px`
  const headerH = header?.offsetHeight ?? 36
  return Math.max(DEFAULT_H, headerH + bodyH + CARD_NODE_BORDER_Y)
}

/** Дополнительная зона для hover / захвата вокруг карточки (px с каждой стороны) */
const CARD_HOVER_PADDING = 8

const SIDES: PortSide[] = ['n', 'e', 's', 'w']

function newId(): string {
  return crypto.randomUUID()
}

function uniqIdsPreserve(order: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of order) {
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

const SECTION_FRAME_PAD = 14

const PORT_OUT = 8

function portWorldPos(
  n: CanvasNode,
  side: PortSide
): { x: number; y: number } {
  switch (side) {
    case 'n':
      return { x: n.x + n.w / 2, y: n.y - PORT_OUT }
    case 'e':
      return { x: n.x + n.w + PORT_OUT, y: n.y + n.h / 2 }
    case 's':
      return { x: n.x + n.w / 2, y: n.y + n.h + PORT_OUT }
    case 'w':
      return { x: n.x - PORT_OUT, y: n.y + n.h / 2 }
  }
}

/** Направление «наружу» от порта — задаёт касательную для кривой Безье */
function outward(side: PortSide): { x: number; y: number } {
  switch (side) {
    case 'n':
      return { x: 0, y: -1 }
    case 'e':
      return { x: 1, y: 0 }
    case 's':
      return { x: 0, y: 1 }
    case 'w':
      return { x: -1, y: 0 }
  }
}

/** Порт на новой карточке, «смотрящий» на источник связи (симметрично fromSide) */
function oppositePortSide(side: PortSide): PortSide {
  switch (side) {
    case 'n':
      return 's'
    case 's':
      return 'n'
    case 'e':
      return 'w'
    case 'w':
      return 'e'
  }
}

/**
 * Подбирает лучшую пару портов для связи двух карточек.
 * Может переопределить стартовую сторону (from), если так визуально лучше.
 */
function pickBestSidePair(
  from: CanvasNode,
  to: CanvasNode,
  releaseWorld: { x: number; y: number },
  fromHint: PortSide
): { fromSide: PortSide; toSide: PortSide } {
  let bestFrom: PortSide = fromHint
  let bestTo: PortSide = oppositePortSide(fromHint)
  let bestScore = Infinity

  for (const fs of SIDES) {
    for (const ts of SIDES) {
      const fp = portWorldPos(from, fs)
      const tp = portWorldPos(to, ts)
      const vx = tp.x - fp.x
      const vy = tp.y - fp.y
      const vlen = Math.hypot(vx, vy) || 1
      const nx = vx / vlen
      const ny = vy / vlen

      const fo = outward(fs)
      const toOut = outward(ts)
      const fromFacing = fo.x * nx + fo.y * ny
      const toFacing = -(toOut.x * nx + toOut.y * ny)
      const releaseToTarget = Math.hypot(
        releaseWorld.x - tp.x,
        releaseWorld.y - tp.y
      )
      const releaseToSource = Math.hypot(
        releaseWorld.x - fp.x,
        releaseWorld.y - fp.y
      )

      // Ниже score -> лучше.
      // 1) короче связь; 2) порты должны "смотреть" друг на друга;
      // 3) вход должен быть близок к точке отпускания;
      // 4) небольшой бонус сохранить исходный from-порт, но не жестко.
      const score =
        vlen -
        fromFacing * 120 -
        toFacing * 120 +
        releaseToTarget * 0.55 +
        releaseToSource * 0.1 +
        (fs === fromHint ? -18 : 18)

      if (score < bestScore) {
        bestScore = score
        bestFrom = fs
        bestTo = ts
      }
    }
  }
  return { fromSide: bestFrom, toSide: bestTo }
}

/** Ставим новую карточку так, чтобы порт входа `incomingSide` совпал с точкой отпускания (wx, wy) */
function positionNodeForIncomingPort(
  incomingSide: PortSide,
  wx: number,
  wy: number,
  w: number,
  h: number
): { x: number; y: number } {
  switch (incomingSide) {
    case 'w':
      return { x: wx + PORT_OUT, y: wy - h / 2 }
    case 'e':
      return { x: wx - w - PORT_OUT, y: wy - h / 2 }
    case 'n':
      return { x: wx - w / 2, y: wy + PORT_OUT }
    case 's':
      return { x: wx - w / 2, y: wy - h - PORT_OUT }
  }
}

function curveStrength(dist: number): number {
  return Math.min(140, Math.max(36, dist * 0.42))
}

/** Чтобы при короткой связи ручки не заходили друг за друга */
function handleExtent(dist: number): number {
  return Math.min(curveStrength(dist), dist * 0.48)
}

function closerReconnectEnd(
  wx: number,
  wy: number,
  ed: CanvasEdge,
  fromNode: CanvasNode,
  toNode: CanvasNode
): 'from' | 'to' {
  const fs = ed.fromSide ?? 'e'
  const ts = ed.toSide ?? 'w'
  const p = portWorldPos(fromNode, fs)
  const q = portWorldPos(toNode, ts)
  const dp = (wx - p.x) ** 2 + (wy - p.y) ** 2
  const dq = (wx - q.x) ** 2 + (wy - q.y) ** 2
  return dp <= dq ? 'from' : 'to'
}

function flexibleEdgePath(
  ed: CanvasEdge,
  fromNode: CanvasNode,
  toNode: CanvasNode
): string {
  const fs = ed.fromSide ?? 'e'
  const ts = ed.toSide ?? 'w'
  const p = portWorldPos(fromNode, fs)
  const q = portWorldPos(toNode, ts)
  const dx = q.x - p.x
  const dy = q.y - p.y
  const dist = Math.hypot(dx, dy) || 1
  const k = handleExtent(dist)
  const o1 = outward(fs)
  const o2 = outward(ts)
  const c1x = p.x + o1.x * k
  const c1y = p.y + o1.y * k
  const c2x = q.x + o2.x * k
  const c2y = q.y + o2.y * k
  return `M ${p.x} ${p.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${q.x} ${q.y}`
}

/** Черновик связи — такая же логика касательной от порта, подтяжка ко второй точке по направлению к курсору */
function flexibleDraftPath(
  p: { x: number; y: number },
  cursor: { x: number; y: number },
  fromSide: PortSide
): string {
  const dx = cursor.x - p.x
  const dy = cursor.y - p.y
  const dist = Math.hypot(dx, dy) || 1
  const k1 = handleExtent(dist)
  const k2 = Math.min(handleExtent(dist), Math.max(16, dist * 0.3))
  const o = outward(fromSide)
  const c1x = p.x + o.x * k1
  const c1y = p.y + o.y * k1
  const ux = dx / dist
  const uy = dy / dist
  const c2x = cursor.x - ux * k2
  const c2y = cursor.y - uy * k2
  return `M ${p.x} ${p.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${cursor.x} ${cursor.y}`
}

/** Снимаем субпиксельный translate — иначе Chrome/Edge размывают текст внутри scale(transform). */
function snapTranslateToDevicePixels(
  tx: number,
  ty: number,
  dpr: number
): { tx: number; ty: number } {
  const r = Math.max(1, dpr)
  return {
    tx: Math.round(tx * r) / r,
    ty: Math.round(ty * r) / r,
  }
}

function devicePixelRatioOr1(): number {
  if (typeof window === 'undefined') return 1
  return window.devicePixelRatio || 1
}

function clientToWorld(
  clientX: number,
  clientY: number,
  viewport: Viewport,
  rect: DOMRect
): { x: number; y: number } {
  const { tx, ty } = snapTranslateToDevicePixels(
    viewport.tx,
    viewport.ty,
    devicePixelRatioOr1()
  )
  const lx = clientX - rect.left
  const ly = clientY - rect.top
  return {
    x: (lx - tx) / viewport.scale,
    y: (ly - ty) / viewport.scale,
  }
}

function worldSize(nodes: CanvasNode[]): { w: number; h: number } {
  let rw = 2000
  let rh = 1400
  for (const n of nodes) {
    rw = Math.max(rw, n.x + n.w + 480)
    rh = Math.max(rh, n.y + n.h + 480)
  }
  return { w: rw, h: rh }
}

/** Пересечение карточки с осью выделения (world), без учёта hover-padding */
function nodeRectIntersectsMarquee(
  n: CanvasNode,
  mx: number,
  my: number,
  mw: number,
  mh: number
): boolean {
  return (
    n.x < mx + mw &&
    n.x + n.w > mx &&
    n.y < my + mh &&
    n.y + n.h > my
  )
}

export function CanvasBoard({
  projectId,
  initialBoard,
  onPersist,
}: CanvasBoardProps) {
  const { t } = useSafeTranslation()
  const [nodes, setNodes] = useState<CanvasNode[]>(initialBoard.nodes)
  const [edges, setEdges] = useState<CanvasEdge[]>(initialBoard.edges)
  const [viewport, setViewport] = useState<Viewport>(initialBoard.viewport)
  const [sections, setSections] = useState<CanvasSection[]>(
    initialBoard.sections ?? []
  )
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [edgeDraft, setEdgeDraft] = useState<EdgeDraft | null>(null)
  const [draftPoint, setDraftPoint] = useState<{ x: number; y: number } | null>(
    null
  )
  const [panning, setPanning] = useState(false)
  const [spaceDown, setSpaceDown] = useState(false)
  /** После перетаскивания — снимать выделение, когда курсор уходит с карточки */
  const [postDragLeaveWatch, setPostDragLeaveWatch] = useState(false)
  /** Режим редактирования текста (заголовок + тело): включается двойным кликом */
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  const viewportRef = useRef<HTMLDivElement>(null)
  const viewportStateRef = useRef(viewport)
  const edgeDraftRef = useRef<EdgeDraft | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panRef = useRef<{
    startClientX: number
    startClientY: number
    origTx: number
    origTy: number
  } | null>(null)
  const bgPressRef = useRef<{
    x: number
    y: number
    pointerId: number
  } | null>(null)
  const dragRef = useRef<{
    startClientX: number
    startClientY: number
    origins: Map<string, { x: number; y: number }>
  } | null>(null)
  const cardGestureRef = useRef<{
    nodeId: string
    startX: number
    startY: number
    pointerId: number
    /** Ctrl/⌘ при нажатии — при начале drag создать копию и тянуть её */
    duplicateDrag: boolean
  } | null>(null)
  const sectionGestureRef = useRef<{
    sectionId: string
    startX: number
    startY: number
    pointerId: number
  } | null>(null)
  const skipSectionTitleCommitRef = useRef(false)
  /** Тап по связи + движение — переподключить ближайший конец */
  const edgeLineGestureRef = useRef<{
    edgeId: string
    movingEnd: 'from' | 'to'
    pointerId: number
    startX: number
    startY: number
    anchorFromId: string
    anchorFromSide: PortSide
    anchorToId: string
    anchorToSide: PortSide
  } | null>(null)
  const selectedIdsRef = useRef(selectedIds)
  useEffect(() => {
    selectedIdsRef.current = selectedIds
  }, [selectedIds])

  const nodesRef = useRef(nodes)
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  const sectionsRef = useRef(sections)
  useEffect(() => {
    sectionsRef.current = sections
  }, [sections])

  const edgesRef = useRef(edges)
  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  const historyPastRef = useRef<BoardHistorySnapshot[]>([])
  const historyFutureRef = useRef<BoardHistorySnapshot[]>([])
  const [historyTick, setHistoryTick] = useState(0)

  const pushHistory = useCallback(() => {
    const snap = cloneBoardSnapshot(
      nodesRef.current,
      edgesRef.current,
      sectionsRef.current
    )
    const key = JSON.stringify(snap)
    const past = historyPastRef.current
    const last = past[past.length - 1]
    if (last && JSON.stringify(last) === key) return
    past.push(snap)
    if (past.length > MAX_BOARD_HISTORY) past.shift()
    historyFutureRef.current = []
    setHistoryTick((n) => n + 1)
  }, [])

  const undo = useCallback(() => {
    const past = historyPastRef.current
    if (past.length === 0) return
    const current = cloneBoardSnapshot(
      nodesRef.current,
      edgesRef.current,
      sectionsRef.current
    )
    const prevSnap = past.pop()!
    historyFutureRef.current.push(current)
    setNodes(prevSnap.nodes)
    setEdges(prevSnap.edges)
    setSections(prevSnap.sections)
    setSelectedIds([])
    setSelectedEdgeId(null)
    setEditingCardId(null)
    setEditingSectionTitleId(null)
    setEdgeDraft(null)
    setDraftPoint(null)
    setPostDragLeaveWatch(false)
    setHistoryTick((n) => n + 1)
  }, [])

  const redo = useCallback(() => {
    const future = historyFutureRef.current
    if (future.length === 0) return
    const current = cloneBoardSnapshot(
      nodesRef.current,
      edgesRef.current,
      sectionsRef.current
    )
    const nextSnap = future.pop()!
    historyPastRef.current.push(current)
    setNodes(nextSnap.nodes)
    setEdges(nextSnap.edges)
    setSections(nextSnap.sections)
    setSelectedIds([])
    setSelectedEdgeId(null)
    setEditingCardId(null)
    setEditingSectionTitleId(null)
    setEdgeDraft(null)
    setDraftPoint(null)
    setPostDragLeaveWatch(false)
    setHistoryTick((n) => n + 1)
  }, [])

  const marqueeRef = useRef<{
    pointerId: number
    startWx: number
    startWy: number
  } | null>(null)
  const [marqueeBox, setMarqueeBox] = useState<{
    x: number
    y: number
    w: number
    h: number
  } | null>(null)
  const [editingSectionTitleId, setEditingSectionTitleId] = useState<
    string | null
  >(null)
  const [draftSectionTitle, setDraftSectionTitle] = useState('')

  useEffect(() => {
    viewportStateRef.current = viewport
  }, [viewport])

  useEffect(() => {
    edgeDraftRef.current = edgeDraft
  }, [edgeDraft])

  useEffect(() => {
    if (!postDragLeaveWatch || selectedIds.length !== 1) return
    const onlyId = selectedIds[0]
    const onMove = (e: PointerEvent) => {
      const els = document.elementsFromPoint(e.clientX, e.clientY)
      const hit = els.find(
        (el): el is HTMLElement =>
          el instanceof HTMLElement &&
          el.hasAttribute('data-canvas-node-id')
      )
      const overId = hit?.getAttribute('data-canvas-node-id') ?? null
      if (overId !== onlyId) {
        setSelectedIds([])
        setPostDragLeaveWatch(false)
      }
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [postDragLeaveWatch, selectedIds])

  const persist = useCallback(() => {
    onPersist(projectId, { nodes, edges, viewport, sections })
  }, [projectId, nodes, edges, viewport, sections, onPersist])

  /** Enter в карточке: сразу сохранить и выйти из редактирования + снять выделение */
  const flushSaveAndExitCardEdit = useCallback(
    (nodeId: string) => {
      pushHistory()
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      const titleInput = document.querySelector<HTMLInputElement>(
        `[data-card-title="${nodeId}"]`
      )
      const bodyArea = document.querySelector<HTMLTextAreaElement>(
        `[data-card-body="${nodeId}"]`
      )
      setNodes((prev) => {
        const next = prev.map((n) => {
          if (n.id !== nodeId) return n
          return {
            ...n,
            title: titleInput?.value ?? n.title,
            text: bodyArea?.value ?? n.text,
          }
        })
        queueMicrotask(() => {
          onPersist(projectId, {
            nodes: next,
            edges,
            viewport,
            sections,
          })
        })
        return next
      })
      setEditingCardId(null)
      setSelectedIds([])
      setPostDragLeaveWatch(false)
      ;(document.activeElement as HTMLElement | null)?.blur()
    },
    [pushHistory, projectId, edges, viewport, sections, onPersist]
  )

  /** После загрузки доски подогнать высоты карточек под текст (без скролла внутри) */
  useLayoutEffect(() => {
    let cancelled = false
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return
        setNodes((prev) => {
          let changed = false
          const next = prev.map((n) => {
            const ta = document.querySelector<HTMLTextAreaElement>(
              `[data-card-body="${n.id}"]`
            )
            if (!ta) return n
            const nextH = measureCanvasCardHeightPx(ta)
            if (nextH !== n.h) {
              changed = true
              return { ...n, h: nextH }
            }
            return n
          })
          return changed ? next : prev
        })
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      persist()
      saveTimerRef.current = null
    }, 400)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [nodes, edges, viewport, sections, persist])

  const { w: worldW, h: worldH } = useMemo(() => worldSize(nodes), [nodes])

  const nodeMap = useMemo(() => {
    const m = new Map<string, CanvasNode>()
    nodes.forEach((n) => m.set(n.id, n))
    return m
  }, [nodes])

  const sectionFrames = useMemo(() => {
    return sections
      .map((sec) => {
        const members = sec.nodeIds
          .map((id) => nodeMap.get(id))
          .filter((n): n is CanvasNode => !!n)
        if (members.length === 0) return null
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity
        for (const n of members) {
          minX = Math.min(minX, n.x)
          minY = Math.min(minY, n.y)
          maxX = Math.max(maxX, n.x + n.w)
          maxY = Math.max(maxY, n.y + n.h)
        }
        const pad = SECTION_FRAME_PAD
        return {
          key: sec.id,
          nodeIds: [...sec.nodeIds],
          x: minX - pad,
          y: minY - pad,
          w: maxX - minX + pad * 2,
          h: maxY - minY + pad * 2,
          title: sec.title?.trim() ?? '',
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
  }, [sections, nodeMap])

  useEffect(() => {
    const ids = new Set(nodes.map((n) => n.id))
    setEdges((prev) => {
      const next = prev.filter((e) => ids.has(e.from) && ids.has(e.to))
      return next.length === prev.length ? prev : next
    })
    setSections((prev) => {
      const next = prev
        .map((s) => ({
          ...s,
          nodeIds: s.nodeIds.filter((id) => ids.has(id)),
        }))
        .filter((s) => s.nodeIds.length >= 2)
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next
    })
  }, [nodes])

  const focusNewCardTitle = useCallback((cardId: string) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLInputElement>(`[data-card-title="${cardId}"]`)
          ?.focus()
      })
    })
  }, [])

  const addCardAt = useCallback((worldX: number, worldY: number) => {
    pushHistory()
    const id = newId()
    const card: CanvasNode = {
      id,
      title: '',
      x: worldX - DEFAULT_W / 2,
      y: worldY - DEFAULT_H / 2,
      w: DEFAULT_W,
      h: DEFAULT_H,
      text: '',
    }
    setNodes((prev) => [...prev, card])
    setSelectedEdgeId(null)
    setSelectedIds([id])
    setEditingCardId(id)
    focusNewCardTitle(id)
  }, [pushHistory, focusNewCardTitle])

  const addCardCenterVisible = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const { tx, ty } = snapTranslateToDevicePixels(
      viewport.tx,
      viewport.ty,
      devicePixelRatioOr1()
    )
    const wx = (cx - tx) / viewport.scale
    const wy = (cy - ty) / viewport.scale
    addCardAt(wx, wy)
  }, [addCardAt, viewport])

  const tryCommitEdge = useCallback(
    (toId: string, toSide: PortSide, fromSideOverride?: PortSide) => {
      const draft = edgeDraftRef.current
      if (!draft || draft.kind !== 'new' || draft.fromId === toId) return
      const a = draft.fromId
      const b = toId
      const exists = edgesRef.current.some(
        (ed) =>
          (ed.from === a && ed.to === b) || (ed.from === b && ed.to === a)
      )
      if (exists) return
      pushHistory()
      setEdges((prev) => {
        return [
          ...prev,
          {
            id: newId(),
            from: draft.fromId,
            to: toId,
            fromSide: fromSideOverride ?? draft.fromSide,
            toSide,
          },
        ]
      })
    },
    [pushHistory]
  )

  useEffect(() => {
    if (!edgeDraft) return
    const onMove = (e: PointerEvent) => {
      const d = edgeDraftRef.current
      const vpEl = viewportRef.current
      if (!d || e.pointerId !== d.pointerId || !vpEl) return
      const rect = vpEl.getBoundingClientRect()
      setDraftPoint(
        clientToWorld(e.clientX, e.clientY, viewportStateRef.current, rect)
      )
    }
    const onUp = (e: PointerEvent) => {
      const d = edgeDraftRef.current
      if (!d || e.pointerId !== d.pointerId) return
      const vpEl = viewportRef.current
      const els = document.elementsFromPoint(e.clientX, e.clientY)
      const portEl = els.find(
        (el): el is HTMLElement =>
          el instanceof HTMLElement && el.hasAttribute('data-canvas-port')
      )

      if (d.kind === 'reconnect') {
        if (portEl) {
          const portNodeId = portEl.dataset.nodeId
          const portSide = portEl.dataset.side as PortSide | undefined
          if (portNodeId && isPortSide(portSide)) {
            pushHistory()
            setEdges((prev) => {
              const ix = prev.findIndex((ed) => ed.id === d.edgeId)
              if (ix < 0) return prev
              const cur = prev[ix]
              let nextFrom = cur.from
              let nextTo = cur.to
              let nextFromSide = cur.fromSide ?? 'e'
              let nextToSide = cur.toSide ?? 'w'
              if (d.movingEnd === 'to') {
                if (portNodeId === cur.from) return prev
                nextTo = portNodeId
                nextToSide = portSide
              } else {
                if (portNodeId === cur.to) return prev
                nextFrom = portNodeId
                nextFromSide = portSide
              }
              if (nextFrom === nextTo) return prev
              const dup = prev.some(
                (ed, i) =>
                  i !== ix &&
                  ((ed.from === nextFrom && ed.to === nextTo) ||
                    (ed.from === nextTo && ed.to === nextFrom))
              )
              if (dup) return prev
              const copy = [...prev]
              copy[ix] = {
                ...cur,
                from: nextFrom,
                to: nextTo,
                fromSide: nextFromSide,
                toSide: nextToSide,
              }
              return copy
            })
          }
        }
        setEdgeDraft(null)
        setDraftPoint(null)
        return
      }

      if (portEl) {
        const toId = portEl.dataset.nodeId
        const toSide = portEl.dataset.side as PortSide | undefined
        if (toId && isPortSide(toSide)) {
          tryCommitEdge(toId, toSide)
        }
      } else {
        const overChrome = els.some(
          (el) =>
            el instanceof HTMLElement &&
            (!!el.closest('.canvas-floating-bar') ||
              !!el.closest('.canvas-control-bubble') ||
              !!el.closest('.canvas-group-bubble') ||
              !!el.closest('.canvas-projects-dock') ||
              !!el.closest('header'))
        )
        const cardAncestor = els.find(
          (el): el is HTMLElement =>
            el instanceof HTMLElement && !!el.closest('[data-canvas-node-id]')
        )
        const cardWrap = cardAncestor?.closest('[data-canvas-node-id]')
        const dropNodeId = cardWrap?.getAttribute('data-canvas-node-id') ?? null

        if (!overChrome && dropNodeId && dropNodeId !== d.fromId && vpEl) {
          const fromNode = nodesRef.current.find((n) => n.id === d.fromId)
          const toNode = nodesRef.current.find((n) => n.id === dropNodeId)
          if (fromNode && toNode) {
            const rect = vpEl.getBoundingClientRect()
            const releaseWorld = clientToWorld(
              e.clientX,
              e.clientY,
              viewportStateRef.current,
              rect
            )
            const sides = pickBestSidePair(
              fromNode,
              toNode,
              releaseWorld,
              d.fromSide
            )
            tryCommitEdge(dropNodeId, sides.toSide, sides.fromSide)
          }
        }

        const hitAnyCard = els.some(
          (el) =>
            el instanceof HTMLElement && !!el.closest('.canvas-node-wrap')
        )
        if (!overChrome && !hitAnyCard && vpEl) {
          pushHistory()
          const rect = vpEl.getBoundingClientRect()
          const { x: wx, y: wy } = clientToWorld(
            e.clientX,
            e.clientY,
            viewportStateRef.current,
            rect
          )
          const newNodeId = newId()
          const toSide = oppositePortSide(d.fromSide)
          const { x: nx, y: ny } = positionNodeForIncomingPort(
            toSide,
            wx,
            wy,
            DEFAULT_W,
            DEFAULT_H
          )
          const node: CanvasNode = {
            id: newNodeId,
            title: '',
            x: nx,
            y: ny,
            w: DEFAULT_W,
            h: DEFAULT_H,
            text: '',
          }
          const edgeId = newId()
          setNodes((prev) => [...prev, node])
          setEdges((prev) => [
            ...prev,
            {
              id: edgeId,
              from: d.fromId,
              to: newNodeId,
              fromSide: d.fromSide,
              toSide,
            },
          ])
          setSelectedIds([newNodeId])
          setEditingCardId(newNodeId)
          focusNewCardTitle(newNodeId)
        }
      }
      setEdgeDraft(null)
      setDraftPoint(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [edgeDraft, focusNewCardTitle, pushHistory, tryCommitEdge])

  const startPortDrag = useCallback(
    (e: React.PointerEvent, node: CanvasNode, side: PortSide) => {
      e.stopPropagation()
      e.preventDefault()
      const vp = viewportRef.current
      if (!vp) return
      const rect = vp.getBoundingClientRect()
      const p0 = portWorldPos(node, side)
      setDraftPoint(p0)
      setSelectedEdgeId(null)
      setEdgeDraft({
        kind: 'new',
        fromId: node.id,
        fromSide: side,
        pointerId: e.pointerId,
      })
      setSelectedIds([node.id])
    },
    []
  )

  const handleEdgePointerDown = useCallback(
    (e: React.PointerEvent, ed: CanvasEdge) => {
      if (e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()
      const from = nodesRef.current.find((n) => n.id === ed.from)
      const to = nodesRef.current.find((n) => n.id === ed.to)
      if (!from || !to) return
      const vpEl = viewportRef.current
      if (!vpEl) return
      const rect = vpEl.getBoundingClientRect()
      const { x: wx, y: wy } = clientToWorld(
        e.clientX,
        e.clientY,
        viewportStateRef.current,
        rect
      )
      const movingEnd = closerReconnectEnd(wx, wy, ed, from, to)
      const afs = ed.fromSide ?? 'e'
      const ats = ed.toSide ?? 'w'
      edgeLineGestureRef.current = {
        edgeId: ed.id,
        movingEnd,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        anchorFromId: ed.from,
        anchorFromSide: afs,
        anchorToId: ed.to,
        anchorToSide: ats,
      }
      setSelectedEdgeId(ed.id)
      setSelectedIds([])
      setPostDragLeaveWatch(false)
      setEditingCardId(null)
    },
    []
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const editingField =
        tag === 'TEXTAREA' ||
        tag === 'INPUT' ||
        !!(e.target as HTMLElement)?.isContentEditable

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        if (!editingField) {
          e.preventDefault()
          if (e.shiftKey) redo()
          else undo()
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        if (!editingField) {
          e.preventDefault()
          redo()
        }
        return
      }

      if (
        e.code === 'Space' &&
        tag !== 'TEXTAREA' &&
        tag !== 'INPUT' &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault()
      }
      if (e.code === 'Space') setSpaceDown(true)
      if (e.key === 'Escape') {
        if (editingSectionTitleId) {
          skipSectionTitleCommitRef.current = true
          setEditingSectionTitleId(null)
          ;(document.activeElement as HTMLElement | null)?.blur?.()
          return
        }
        if (editingCardId) {
          setEditingCardId(null)
          ;(document.activeElement as HTMLElement | null)?.blur?.()
          return
        }
        setSelectedIds([])
        setPostDragLeaveWatch(false)
        setEdgeDraft(null)
        setDraftPoint(null)
        setSelectedEdgeId(null)
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement
        if (
          active &&
          (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')
        ) {
          return
        }
        if (selectedEdgeId) {
          e.preventDefault()
          pushHistory()
          setEdges((prev) => prev.filter((ed) => ed.id !== selectedEdgeId))
          setSelectedEdgeId(null)
          return
        }
        if (selectedIds.length > 0) {
          e.preventDefault()
          pushHistory()
          const remove = new Set(selectedIds)
          setEdges((prev) =>
            prev.filter((ed) => !remove.has(ed.from) && !remove.has(ed.to))
          )
          setNodes((prev) => prev.filter((n) => !remove.has(n.id)))
          setEditingCardId(null)
          setSelectedIds([])
          setPostDragLeaveWatch(false)
        }
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceDown(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [
    selectedIds,
    selectedEdgeId,
    editingCardId,
    editingSectionTitleId,
    pushHistory,
    redo,
    undo,
  ])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const rect = vp.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        setViewport((v) => {
          const delta = -e.deltaY * 0.002
          const nextScale = Math.min(
            CANVAS_SCALE_MAX,
            Math.max(CANVAS_SCALE_MIN, v.scale * (1 + delta))
          )
          const wx = (mx - v.tx) / v.scale
          const wy = (my - v.ty) / v.scale
          return {
            scale: nextScale,
            tx: mx - wx * nextScale,
            ty: my - wy * nextScale,
          }
        })
      } else {
        setViewport((v) => ({
          ...v,
          tx: v.tx - e.deltaX,
          ty: v.ty - e.deltaY,
        }))
      }
    }
    vp.addEventListener('wheel', wheel, { passive: false })
    return () => vp.removeEventListener('wheel', wheel)
  }, [])

  const startPan = useCallback(
    (clientX: number, clientY: number, tx: number, ty: number) => {
      setPanning(true)
      panRef.current = {
        startClientX: clientX,
        startClientY: clientY,
        origTx: tx,
        origTy: ty,
      }
    },
    []
  )

  const onViewportPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const canPanMiddle = e.button === 1
      const canPanSpace = e.button === 0 && spaceDown
      if (canPanMiddle || canPanSpace) {
        e.preventDefault()
        viewportRef.current?.setPointerCapture(e.pointerId)
        startPan(e.clientX, e.clientY, viewport.tx, viewport.ty)
        return
      }
      if (e.button !== 0) return
      const el = e.target as HTMLElement
      if (el.closest('.canvas-node-wrap')) return
      if (el.closest('.canvas-section-name-bubble')) return
      setSelectedIds([])
      setSelectedEdgeId(null)
      setPostDragLeaveWatch(false)
      setEditingCardId(null)
      setEditingSectionTitleId(null)
      bgPressRef.current = {
        x: e.clientX,
        y: e.clientY,
        pointerId: e.pointerId,
      }
    },
    [spaceDown, startPan, viewport.tx, viewport.ty]
  )

  const onViewportPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const vpEl = viewportRef.current

      const mq = marqueeRef.current
      if (mq && e.pointerId === mq.pointerId && vpEl) {
        const rect = vpEl.getBoundingClientRect()
        const cur = clientToWorld(
          e.clientX,
          e.clientY,
          viewportStateRef.current,
          rect
        )
        const mx = Math.min(mq.startWx, cur.x)
        const my = Math.min(mq.startWy, cur.y)
        const mw = Math.abs(cur.x - mq.startWx)
        const mh = Math.abs(cur.y - mq.startWy)
        setMarqueeBox({ x: mx, y: my, w: mw, h: mh })
        return
      }

      if (
        bgPressRef.current &&
        !panRef.current &&
        bgPressRef.current.pointerId === e.pointerId &&
        vpEl
      ) {
        const dx = e.clientX - bgPressRef.current.x
        const dy = e.clientY - bgPressRef.current.y
        if (dx * dx + dy * dy > MARQUEE_THRESHOLD_SQ) {
          viewportRef.current?.setPointerCapture(e.pointerId)
          const rect = vpEl.getBoundingClientRect()
          const p = clientToWorld(
            bgPressRef.current.x,
            bgPressRef.current.y,
            viewportStateRef.current,
            rect
          )
          marqueeRef.current = {
            pointerId: e.pointerId,
            startWx: p.x,
            startWy: p.y,
          }
          setMarqueeBox({ x: p.x, y: p.y, w: 0, h: 0 })
          bgPressRef.current = null
        }
      }

      const elg = edgeLineGestureRef.current
      if (
        elg &&
        e.pointerId === elg.pointerId &&
        !edgeDraftRef.current &&
        !dragRef.current &&
        !panRef.current &&
        !marqueeRef.current &&
        vpEl
      ) {
        const dx = e.clientX - elg.startX
        const dy = e.clientY - elg.startY
        if (dx * dx + dy * dy > CARD_DRAG_THRESHOLD_SQ) {
          const rect = vpEl.getBoundingClientRect()
          const wp = clientToWorld(
            e.clientX,
            e.clientY,
            viewportStateRef.current,
            rect
          )
          setEdgeDraft({
            kind: 'reconnect',
            edgeId: elg.edgeId,
            movingEnd: elg.movingEnd,
            pointerId: elg.pointerId,
            anchorFromId: elg.anchorFromId,
            anchorFromSide: elg.anchorFromSide,
            anchorToId: elg.anchorToId,
            anchorToSide: elg.anchorToSide,
          })
          setDraftPoint(wp)
          edgeLineGestureRef.current = null
        }
      }

      const cg = cardGestureRef.current
      if (
        cg &&
        e.pointerId === cg.pointerId &&
        !dragRef.current &&
        !panRef.current &&
        !marqueeRef.current
      ) {
        const dx = e.clientX - cg.startX
        const dy = e.clientY - cg.startY
        if (dx * dx + dy * dy > CARD_DRAG_THRESHOLD_SQ) {
          const node = nodesRef.current.find((n) => n.id === cg.nodeId)
          if (node) {
            const wantDuplicate =
              e.ctrlKey || e.metaKey || cg.duplicateDrag
            let origins = new Map<string, { x: number; y: number }>()
            if (wantDuplicate) {
              pushHistory()
              const nid = newId()
              const clone: CanvasNode = {
                id: nid,
                title: node.title,
                text: node.text,
                x: node.x,
                y: node.y,
                w: node.w,
                h: node.h,
                ...(node.accent ? { accent: node.accent } : {}),
              }
              setNodes((prev) => [...prev, clone])
              setSelectedIds([nid])
              origins.set(nid, { x: node.x, y: node.y })
            } else {
              pushHistory()
              const sel = selectedIdsRef.current
              if (sel.includes(node.id) && sel.length > 1) {
                for (const id of sel) {
                  const nn = nodesRef.current.find((x) => x.id === id)
                  if (nn) origins.set(id, { x: nn.x, y: nn.y })
                }
              } else {
                origins.set(node.id, { x: node.x, y: node.y })
              }
            }
            dragRef.current = {
              startClientX: cg.startX,
              startClientY: cg.startY,
              origins,
            }
            setPostDragLeaveWatch(false)
            setEditingCardId(null)
            ;(document.activeElement as HTMLElement | null)?.blur?.()
          }
          cardGestureRef.current = null
        }
      }

      const sg = sectionGestureRef.current
      if (
        sg &&
        e.pointerId === sg.pointerId &&
        !dragRef.current &&
        !panRef.current &&
        !marqueeRef.current &&
        !cardGestureRef.current &&
        !edgeDraftRef.current
      ) {
        const dx = e.clientX - sg.startX
        const dy = e.clientY - sg.startY
        if (dx * dx + dy * dy > CARD_DRAG_THRESHOLD_SQ) {
          const sec = sectionsRef.current.find((s) => s.id === sg.sectionId)
          if (sec && sec.nodeIds.length > 0) {
            const origins = new Map<string, { x: number; y: number }>()
            for (const id of sec.nodeIds) {
              const nn = nodesRef.current.find((x) => x.id === id)
              if (nn) origins.set(id, { x: nn.x, y: nn.y })
            }
            if (origins.size > 0) {
              pushHistory()
              dragRef.current = {
                startClientX: sg.startX,
                startClientY: sg.startY,
                origins,
              }
              setSelectedIds(sec.nodeIds)
              setEditingCardId(null)
              ;(document.activeElement as HTMLElement | null)?.blur?.()
            }
          }
          sectionGestureRef.current = null
        }
      }

      if (dragRef.current) {
        const d = dragRef.current
        const dx = (e.clientX - d.startClientX) / viewport.scale
        const dy = (e.clientY - d.startClientY) / viewport.scale
        setNodes((prev) =>
          prev.map((n) => {
            const o = d.origins.get(n.id)
            if (!o) return n
            return { ...n, x: o.x + dx, y: o.y + dy }
          })
        )
        return
      }
      if (!panRef.current) return
      const p = panRef.current
      const pdx = e.clientX - p.startClientX
      const pdy = e.clientY - p.startClientY
      setViewport((v) => ({
        ...v,
        tx: p.origTx + pdx,
        ty: p.origTy + pdy,
      }))
    },
    [pushHistory, viewport.scale]
  )

  const endPanOrDrag = useCallback(() => {
    panRef.current = null
    dragRef.current = null
    bgPressRef.current = null
    setPanning(false)
  }, [])

  const onViewportPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      cardGestureRef.current = null
      if (sectionGestureRef.current?.pointerId === e.pointerId) {
        sectionGestureRef.current = null
      }
      if (edgeLineGestureRef.current?.pointerId === e.pointerId) {
        edgeLineGestureRef.current = null
      }
      if (bgPressRef.current?.pointerId === e.pointerId) {
        bgPressRef.current = null
      }
      if (marqueeRef.current?.pointerId === e.pointerId) {
        marqueeRef.current = null
        setMarqueeBox(null)
      }
      setPostDragLeaveWatch(false)
      endPanOrDrag()
      try {
        viewportRef.current?.releasePointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
    },
    [endPanOrDrag]
  )

  const onViewportPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const vpEl = viewportRef.current
      const mqUp = marqueeRef.current
      if (mqUp && e.pointerId === mqUp.pointerId && vpEl) {
        const rect = vpEl.getBoundingClientRect()
        const end = clientToWorld(
          e.clientX,
          e.clientY,
          viewportStateRef.current,
          rect
        )
        const mx = Math.min(mqUp.startWx, end.x)
        const my = Math.min(mqUp.startWy, end.y)
        const mw = Math.abs(end.x - mqUp.startWx)
        const mh = Math.abs(end.y - mqUp.startWy)
        const meaningful = mw >= 4 && mh >= 4
        const hits = meaningful
          ? nodesRef.current
              .filter((n) =>
                nodeRectIntersectsMarquee(n, mx, my, mw, mh)
              )
              .map((n) => n.id)
          : []
        setSelectedIds(hits)
        setSelectedEdgeId(null)
        marqueeRef.current = null
        setMarqueeBox(null)
      }

      if (bgPressRef.current?.pointerId === e.pointerId) {
        bgPressRef.current = null
      }

      if (edgeLineGestureRef.current?.pointerId === e.pointerId) {
        edgeLineGestureRef.current = null
      }

      const dragSnap = dragRef.current
      cardGestureRef.current = null
      if (sectionGestureRef.current?.pointerId === e.pointerId) {
        sectionGestureRef.current = null
      }
      endPanOrDrag()

      if (dragSnap) {
        if (dragSnap.origins.size === 1) {
          const onlyId = [...dragSnap.origins.keys()][0]
          const els = document.elementsFromPoint(e.clientX, e.clientY)
          const hit = els.find(
            (el): el is HTMLElement =>
              el instanceof HTMLElement &&
              el.hasAttribute('data-canvas-node-id')
          )
          const overId = hit?.getAttribute('data-canvas-node-id') ?? null
          if (overId !== onlyId) {
            setSelectedIds([])
            setPostDragLeaveWatch(false)
          } else {
            setPostDragLeaveWatch(true)
          }
        } else {
          setPostDragLeaveWatch(false)
        }
      }

      try {
        viewportRef.current?.releasePointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
    },
    [endPanOrDrag]
  )

  const fitView = useCallback(() => {
    const el = viewportRef.current
    if (!el || nodes.length === 0) return
    const rect = el.getBoundingClientRect()
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + n.w)
      maxY = Math.max(maxY, n.y + n.h)
    }
    const pad = 80
    const bw = maxX - minX + pad * 2
    const bh = maxY - minY + pad * 2
    const sx = rect.width / bw
    const sy = rect.height / bh
    const scale = Math.min(
      CANVAS_SCALE_MAX,
      Math.max(CANVAS_SCALE_MIN, Math.min(sx, sy) * 0.92)
    )
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    setViewport({
      scale,
      tx: rect.width / 2 - cx * scale,
      ty: rect.height / 2 - cy * scale,
    })
  }, [nodes])

  const selectedNodes = useMemo(
    () =>
      selectedIds
        .map((id) => nodeMap.get(id))
        .filter((n): n is CanvasNode => !!n),
    [selectedIds, nodeMap]
  )

  const focusSelection = useCallback(() => {
    const el = viewportRef.current
    if (!el || selectedNodes.length === 0) return
    const rect = el.getBoundingClientRect()
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const n of selectedNodes) {
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + n.w)
      maxY = Math.max(maxY, n.y + n.h)
    }
    const pad = 72
    const bw = maxX - minX + pad * 2
    const bh = maxY - minY + pad * 2
    const sx = rect.width / bw
    const sy = rect.height / bh
    const scale = Math.min(
      CANVAS_SCALE_MAX,
      Math.max(CANVAS_SCALE_MIN, Math.min(sx, sy) * 0.92)
    )
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    setViewport({
      scale,
      tx: rect.width / 2 - cx * scale,
      ty: rect.height / 2 - cy * scale,
    })
  }, [selectedNodes])

  const zoomFromViewportCenter = useCallback((factor: number) => {
    setViewport((v) => {
      const el = viewportRef.current
      if (!el) return v
      const rect = el.getBoundingClientRect()
      const mx = rect.width / 2
      const my = rect.height / 2
      const nextScale = Math.min(
        CANVAS_SCALE_MAX,
        Math.max(CANVAS_SCALE_MIN, v.scale * factor)
      )
      if (Math.abs(nextScale - v.scale) < 1e-6) return v
      const wx = (mx - v.tx) / v.scale
      const wy = (my - v.ty) / v.scale
      return {
        scale: nextScale,
        tx: mx - wx * nextScale,
        ty: my - wy * nextScale,
      }
    })
  }, [])

  const alignSelected = useCallback(
    (
      mode:
        | 'v-left'
        | 'v-center'
        | 'v-right'
        | 'h-top'
        | 'h-center'
        | 'h-bottom'
    ) => {
      if (selectedNodes.length < 2) return
      pushHistory()
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const n of selectedNodes) {
        minX = Math.min(minX, n.x)
        minY = Math.min(minY, n.y)
        maxX = Math.max(maxX, n.x + n.w)
        maxY = Math.max(maxY, n.y + n.h)
      }
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      const selected = new Set(selectedIds)
      setNodes((prev) =>
        prev.map((n) => {
          if (!selected.has(n.id)) return n
          switch (mode) {
            case 'v-left':
              return { ...n, x: minX }
            case 'v-center':
              return { ...n, x: centerX - n.w / 2 }
            case 'v-right':
              return { ...n, x: maxX - n.w }
            case 'h-top':
              return { ...n, y: minY }
            case 'h-center':
              return { ...n, y: centerY - n.h / 2 }
            case 'h-bottom':
              return { ...n, y: maxY - n.h }
          }
        })
      )
    },
    [pushHistory, selectedIds, selectedNodes]
  )

  const distributeSelected = useCallback(
    (axis: 'x' | 'y') => {
      if (selectedNodes.length < 3) return
      const sorted = [...selectedNodes].sort((a, b) =>
        axis === 'x' ? a.x - b.x : a.y - b.y
      )
      const first = sorted[0]
      const last = sorted[sorted.length - 1]
      const inner = sorted.slice(1, -1)
      if (inner.length === 0) return

      pushHistory()

      if (axis === 'x') {
        const totalInner = inner.reduce((acc, n) => acc + n.w, 0)
        const span = last.x - (first.x + first.w)
        const gap = (span - totalInner) / (sorted.length - 1)
        let cursor = first.x + first.w + gap
        const pos = new Map<string, number>()
        for (const n of inner) {
          pos.set(n.id, cursor)
          cursor += n.w + gap
        }
        setNodes((prev) =>
          prev.map((n) => (pos.has(n.id) ? { ...n, x: pos.get(n.id)! } : n))
        )
      } else {
        const totalInner = inner.reduce((acc, n) => acc + n.h, 0)
        const span = last.y - (first.y + first.h)
        const gap = (span - totalInner) / (sorted.length - 1)
        let cursor = first.y + first.h + gap
        const pos = new Map<string, number>()
        for (const n of inner) {
          pos.set(n.id, cursor)
          cursor += n.h + gap
        }
        setNodes((prev) =>
          prev.map((n) => (pos.has(n.id) ? { ...n, y: pos.get(n.id)! } : n))
        )
      }
    },
    [pushHistory, selectedNodes]
  )

  const applyAccentToSelection = useCallback(
    (accent: CanvasCardAccent) => {
      if (selectedIds.length === 0) return
      pushHistory()
      const sel = new Set(selectedIds)
      setNodes((prev) =>
        prev.map((n) => {
          if (!sel.has(n.id)) return n
          if (accent === 'default') {
            const { accent: _removed, ...rest } = n
            return rest as CanvasNode
          }
          return { ...n, accent }
        })
      )
    },
    [pushHistory, selectedIds]
  )

  const beginEditSectionTitle = useCallback(
    (sectionId: string) => {
      const title =
        sections.find((s) => s.id === sectionId)?.title?.trim() ?? ''
      setDraftSectionTitle(title)
      setEditingSectionTitleId(sectionId)
      setEditingCardId(null)
    },
    [sections]
  )

  const commitSectionTitle = useCallback(
    (sectionId: string, raw: string) => {
      pushHistory()
      const v = raw.trim()
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, title: v } : s))
      )
      setEditingSectionTitleId((cur) =>
        cur === sectionId ? null : cur
      )
    },
    [pushHistory]
  )

  const groupSelectedIntoSection = useCallback(() => {
    const ids = uniqIdsPreserve(selectedIds)
    if (ids.length < 2) return
    pushHistory()
    const idSet = new Set(ids)
    setSections((prev) => {
      const stripped = prev
        .map((s) => ({
          ...s,
          nodeIds: s.nodeIds.filter((nid) => !idSet.has(nid)),
        }))
        .filter((s) => s.nodeIds.length >= 2)
      return [
        ...stripped,
        {
          id: newId(),
          title: t('canvas.sectionDefaultName'),
          nodeIds: ids,
        },
      ]
    })
  }, [pushHistory, selectedIds, t])

  const removeSelectedFromSections = useCallback(() => {
    const sel = new Set(selectedIds)
    if (sel.size === 0) return
    pushHistory()
    setSections((prev) =>
      prev
        .map((s) => ({
          ...s,
          nodeIds: s.nodeIds.filter((id) => !sel.has(id)),
        }))
        .filter((s) => s.nodeIds.length >= 2)
    )
  }, [pushHistory, selectedIds])

  const selectionIsWholeSection = useMemo(() => {
    if (selectedIds.length < 2) return false
    const sel = new Set(selectedIds)
    return sections.some(
      (s) =>
        s.nodeIds.length === sel.size &&
        s.nodeIds.every((id) => sel.has(id))
    )
  }, [selectedIds, sections])

  const selectionTouchesSection = useMemo(() => {
    if (selectedIds.length === 0) return false
    const sel = new Set(selectedIds)
    return sections.some((s) => s.nodeIds.some((id) => sel.has(id)))
  }, [selectedIds, sections])

  const selectionBubblePos = useMemo(() => {
    if (selectedNodes.length === 0) return null
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    for (const n of selectedNodes) {
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + n.w)
    }
    return {
      left: ((minX + maxX) / 2) * viewport.scale + viewport.tx,
      top: minY * viewport.scale + viewport.ty - 16,
    }
  }, [selectedNodes, viewport.scale, viewport.tx, viewport.ty])

  const showPortsFor = useCallback(
    (nodeId: string) => {
      if (hoveredId === nodeId || selectedIds.includes(nodeId)) return true
      if (edgeDraft !== null) return true
      if (selectedEdgeId) {
        const ed = edges.find((e) => e.id === selectedEdgeId)
        if (ed && (ed.from === nodeId || ed.to === nodeId)) return true
      }
      return false
    },
    [hoveredId, selectedIds, edgeDraft, selectedEdgeId, edges]
  )

  const { tx: paintTx, ty: paintTy } = snapTranslateToDevicePixels(
    viewport.tx,
    viewport.ty,
    devicePixelRatioOr1()
  )
  const worldTransform = `translate3d(${paintTx}px, ${paintTy}px, 0) scale(${viewport.scale})`

  const draftLinePath = useMemo(() => {
    if (!edgeDraft || !draftPoint) return null
    if (edgeDraft.kind === 'new') {
      const fromNode = nodeMap.get(edgeDraft.fromId)
      if (!fromNode) return null
      const p = portWorldPos(fromNode, edgeDraft.fromSide)
      return flexibleDraftPath(p, draftPoint, edgeDraft.fromSide)
    }
    const fromNode = nodeMap.get(edgeDraft.anchorFromId)
    const toNode = nodeMap.get(edgeDraft.anchorToId)
    if (!fromNode || !toNode) return null
    if (edgeDraft.movingEnd === 'to') {
      const p = portWorldPos(fromNode, edgeDraft.anchorFromSide)
      return flexibleDraftPath(p, draftPoint, edgeDraft.anchorFromSide)
    }
    const p = portWorldPos(toNode, edgeDraft.anchorToSide)
    return flexibleDraftPath(p, draftPoint, edgeDraft.anchorToSide)
  }, [edgeDraft, draftPoint, nodeMap])

  void historyTick
  const canUndo = historyPastRef.current.length > 0
  const canRedo = historyFutureRef.current.length > 0

  return (
    <div className="canvas-page">
      <div
        ref={viewportRef}
        className={`canvas-viewport ${panning ? 'is-panning' : ''}`}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onPointerCancel={onViewportPointerCancel}
        role="application"
        aria-label={t('canvas.ariaBoard')}
      >
        <div
          className={`canvas-world ${panning ? 'is-panning' : ''}`}
          style={{
            transform: worldTransform,
            width: worldW,
            height: worldH,
          }}
        >
          <svg
            className="canvas-edges"
            width={worldW}
            height={worldH}
            aria-hidden
          >
            {edges.map((ed) => {
              const from = nodeMap.get(ed.from)
              const to = nodeMap.get(ed.to)
              if (!from || !to) return null
              const hidden =
                edgeDraft?.kind === 'reconnect' &&
                edgeDraft.edgeId === ed.id
              if (hidden) return null
              const pathD = flexibleEdgePath(ed, from, to)
              return (
                <g key={ed.id}>
                  <path
                    className="canvas-edge-hit"
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    strokeLinecap="round"
                    data-canvas-edge-id={ed.id}
                    onPointerDown={(e) => handleEdgePointerDown(e, ed)}
                  />
                  <path
                    className={`canvas-edge-visible ${selectedEdgeId === ed.id ? 'is-selected' : ''}`}
                    d={pathD}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              )
            })}
            {draftLinePath && (
              <path
                d={draftLinePath}
                fill="none"
                stroke="#2563eb"
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                opacity={0.85}
                pointerEvents="none"
              />
            )}
            {marqueeBox && marqueeBox.w + marqueeBox.h > 0 && (
              <rect
                className="canvas-marquee-rect"
                x={marqueeBox.x}
                y={marqueeBox.y}
                width={marqueeBox.w}
                height={marqueeBox.h}
                fill="rgb(37 99 235 / 0.12)"
                stroke="rgb(37 99 235 / 0.55)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            )}
          </svg>

          <div className="canvas-section-frames-layer">
            {sectionFrames.map((f) => (
              <div
                key={f.key}
                className="canvas-section-unit"
                style={{
                  left: f.x,
                  top: f.y,
                  width: f.w,
                  height: f.h,
                }}
              >
                <div className="canvas-section-frame" aria-hidden />
              </div>
            ))}
          </div>

          {nodes.map((node) => {
            const accent = node.accent ?? 'default'
            const showPorts = showPortsFor(node.id)
            return (
              <div
                key={node.id}
                data-canvas-node-id={node.id}
                className={`canvas-node-wrap ${hoveredId === node.id ? 'is-hover' : ''} ${selectedIds.includes(node.id) ? 'is-selected' : ''} ${showPorts ? 'show-ports' : ''}`}
                style={{
                  left: node.x - CARD_HOVER_PADDING,
                  top: node.y - CARD_HOVER_PADDING,
                  width: node.w + CARD_HOVER_PADDING * 2,
                  height: node.h + CARD_HOVER_PADDING * 2,
                  zIndex: selectedIds.includes(node.id)
                    ? 5
                    : hoveredId === node.id
                      ? 4
                      : 3,
                }}
                onPointerEnter={() => setHoveredId(node.id)}
                onPointerLeave={() =>
                  setHoveredId((h) => (h === node.id ? null : h))
                }
                onDoubleClick={(e) => {
                  const el = e.target as HTMLElement
                  if (el.closest('[data-canvas-port]')) return
                  e.stopPropagation()
                  setEditingCardId(node.id)
                  const fromTitle = !!el.closest('[data-card-title-zone]')
                  const nid = node.id
                  window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(() => {
                      if (fromTitle) {
                        document
                          .querySelector<HTMLInputElement>(
                            `[data-card-title="${nid}"]`
                          )
                          ?.focus()
                      } else {
                        document
                          .querySelector<HTMLTextAreaElement>(
                            `[data-card-body="${nid}"]`
                          )
                          ?.focus()
                      }
                    })
                  })
                }}
                onPointerDownCapture={(e) => {
                  if (e.button !== 0) return
                  const target = e.target as HTMLElement
                  if (target.closest('[data-canvas-port]')) return

                  const inBodyField = !!target.closest('[data-card-body]')
                  const inTitleField = !!target.closest('.canvas-node-title')

                  if (
                    editingCardId === node.id &&
                    (inBodyField || inTitleField)
                  ) {
                    return
                  }
                  if (!inTitleField && !inBodyField) {
                    const wrapEl = e.currentTarget as HTMLElement
                    const ae = document.activeElement as HTMLElement | null
                    if (
                      ae &&
                      wrapEl.contains(ae) &&
                      (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')
                    ) {
                      ae.blur()
                    }
                    if (editingCardId === node.id) {
                      setEditingCardId(null)
                    }
                  }
                  cardGestureRef.current = {
                    nodeId: node.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    pointerId: e.pointerId,
                    duplicateDrag: e.ctrlKey || e.metaKey,
                  }
                  setSelectedEdgeId(null)
                  if (e.shiftKey) {
                    setSelectedIds((prev) => {
                      const set = new Set(prev)
                      if (set.has(node.id)) set.delete(node.id)
                      else set.add(node.id)
                      return [...set]
                    })
                  } else {
                    setSelectedIds((prev) => {
                      if (prev.length > 1 && prev.includes(node.id)) {
                        return prev
                      }
                      return [node.id]
                    })
                  }
                  setPostDragLeaveWatch(false)
                }}
              >
                <div
                  className="canvas-node-bounds"
                  style={{
                    position: 'absolute',
                    left: CARD_HOVER_PADDING,
                    top: CARD_HOVER_PADDING,
                    width: node.w,
                    height: node.h,
                  }}
                >
                <div
                  className={`canvas-node canvas-node--accent-${accent} ${selectedIds.includes(node.id) ? 'is-selected' : ''}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: node.h,
                  }}
                >
                  <div
                    className="canvas-node-drag"
                    data-card-title-zone=""
                    data-card-header=""
                  >
                    <button
                      type="button"
                      className="canvas-node-drag-grip"
                      aria-label={t('canvas.dragCard')}
                      tabIndex={-1}
                    >
                      <GripHorizontal className="w-4 h-4 pointer-events-none" aria-hidden />
                    </button>
                    <input
                      type="text"
                      data-card-title={node.id}
                      readOnly={editingCardId !== node.id}
                      className={`canvas-node-title ${editingCardId !== node.id ? 'canvas-node-title-inactive' : ''}`}
                      value={node.title}
                      placeholder={t('canvas.card')}
                      maxLength={120}
                      onChange={(e) => {
                        const title = e.target.value
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === node.id ? { ...n, title } : n
                          )
                        )
                        requestAnimationFrame(() => {
                          const ta =
                            document.querySelector<HTMLTextAreaElement>(
                              `[data-card-body="${node.id}"]`
                            )
                          if (!ta) return
                          const nextH = measureCanvasCardHeightPx(ta)
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === node.id && n.h !== nextH
                                ? { ...n, h: nextH }
                                : n
                            )
                          )
                        })
                      }}
                      onPointerDown={
                        editingCardId === node.id
                          ? (e) => e.stopPropagation()
                          : undefined
                      }
                      onClick={
                        editingCardId === node.id
                          ? (e) => e.stopPropagation()
                          : undefined
                      }
                      onKeyDown={(e) => {
                        if (
                          editingCardId !== node.id ||
                          e.key !== 'Enter'
                        ) {
                          return
                        }
                        e.preventDefault()
                        flushSaveAndExitCardEdit(node.id)
                      }}
                      spellCheck={false}
                    />
                  </div>
                  <textarea
                    data-card-body={node.id}
                    value={node.text}
                    placeholder={t('canvas.placeholder')}
                    className={
                      editingCardId === node.id
                        ? undefined
                        : 'canvas-node-body-inactive'
                    }
                    onChange={(e) => {
                      const text = e.target.value
                      const ta = e.currentTarget
                      const nextH = measureCanvasCardHeightPx(ta)
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === node.id
                            ? { ...n, text, h: nextH }
                            : n
                        )
                      )
                    }}
                  />
                </div>

                {showPorts && (
                  <div className="canvas-ports" aria-hidden>
                    {SIDES.map((side) => (
                      <button
                        key={side}
                        type="button"
                        data-canvas-port
                        data-node-id={node.id}
                        data-side={side}
                        className="canvas-port"
                        tabIndex={-1}
                        aria-label={t(`canvas.port.${side}`)}
                        onPointerDown={(e) => startPortDrag(e, node, side)}
                      />
                    ))}
                  </div>
                )}
                </div>
              </div>
            )
          })}

          <div className="canvas-section-labels-layer">
            {sectionFrames.map((f) => {
              const isEditingTitle = editingSectionTitleId === f.key
              const labelText = f.title || t('canvas.sectionNamePlaceholder')
              return (
                <div
                  key={`${f.key}-label`}
                  className="canvas-section-label-unit"
                  style={{
                    left: f.x,
                    top: f.y,
                    width: f.w,
                    height: f.h,
                  }}
                >
                  {isEditingTitle ? (
                    <div className="canvas-section-name-bubble is-editing">
                      <input
                        type="text"
                        className="canvas-section-title-input"
                        value={draftSectionTitle}
                        onChange={(e) =>
                          setDraftSectionTitle(e.target.value)
                        }
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label={t('canvas.renameSectionAria')}
                        autoComplete="off"
                        maxLength={120}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            commitSectionTitle(f.key, draftSectionTitle)
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            skipSectionTitleCommitRef.current = true
                            setEditingSectionTitleId(null)
                          }
                        }}
                        onBlur={() => {
                          if (skipSectionTitleCommitRef.current) {
                            skipSectionTitleCommitRef.current = false
                            return
                          }
                          commitSectionTitle(f.key, draftSectionTitle)
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="canvas-section-name-bubble"
                      aria-label={t('canvas.sectionBubbleAria', {
                        name: labelText,
                      })}
                      onPointerDown={(e) => {
                        if (e.button !== 0) return
                        e.stopPropagation()
                        const detail =
                          (e as unknown as { detail?: number }).detail ?? 0
                        if (detail >= 2) {
                          beginEditSectionTitle(f.key)
                          return
                        }
                        viewportRef.current?.setPointerCapture(
                          e.pointerId
                        )
                        sectionGestureRef.current = {
                          sectionId: f.key,
                          startX: e.clientX,
                          startY: e.clientY,
                          pointerId: e.pointerId,
                        }
                        setSelectedEdgeId(null)
                        setEditingSectionTitleId(null)
                        setSelectedIds(f.nodeIds)
                        setPostDragLeaveWatch(false)
                      }}
                      onDoubleClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        beginEditSectionTitle(f.key)
                      }}
                    >
                      <GripHorizontal
                        className="canvas-section-name-grip"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span
                        className={
                          f.title
                            ? 'canvas-section-name-text'
                            : 'canvas-section-name-text is-placeholder'
                        }
                      >
                        {f.title || t('canvas.sectionNamePlaceholder')}
                      </span>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {selectionBubblePos && (
          <div
            className="canvas-group-bubble"
            style={{
              left: selectionBubblePos.left,
              top: selectionBubblePos.top,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div
              className="canvas-accent-swatches"
              role="group"
              aria-label={t('canvas.cardAccentGroupAria')}
            >
              {CARD_ACCENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`canvas-accent-swatch canvas-accent-swatch--${a}`}
                  title={t(`canvas.accent.${a}`)}
                  aria-label={t(`canvas.accent.${a}`)}
                  aria-pressed={
                    selectedNodes.length > 0 &&
                    selectedNodes.every((n) => (n.accent ?? 'default') === a)
                  }
                  onClick={() => applyAccentToSelection(a)}
                />
              ))}
            </div>
            {selectedNodes.length >= 2 && !selectionIsWholeSection ? (
              <button
                type="button"
                title={t('canvas.groupIntoSection')}
                aria-label={t('canvas.groupIntoSection')}
                onClick={groupSelectedIntoSection}
              >
                <Group className="w-4 h-4" strokeWidth={1.5} aria-hidden />
              </button>
            ) : null}
            {selectionTouchesSection ? (
              <button
                type="button"
                title={t('canvas.ungroupSection')}
                aria-label={t('canvas.ungroupSection')}
                onClick={removeSelectedFromSections}
              >
                <Ungroup className="w-4 h-4" strokeWidth={1.5} aria-hidden />
              </button>
            ) : null}
            {selectedNodes.length >= 2 ? (
              <>
                <button
                  type="button"
                  title="Align left"
                  aria-label="Align left"
                  onClick={() => alignSelected('v-left')}
                >
                  <svg viewBox="0 0 16 16" aria-hidden>
                    <path d="M3 2v12M5 4h8M5 8h6M5 12h8" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Align vertical center"
                  aria-label="Align vertical center"
                  onClick={() => alignSelected('v-center')}
                >
                  <svg viewBox="0 0 16 16" aria-hidden>
                    <path d="M8 2v12M2 4h12M4 8h8M2 12h12" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Align right"
                  aria-label="Align right"
                  onClick={() => alignSelected('v-right')}
                >
                  <svg viewBox="0 0 16 16" aria-hidden>
                    <path d="M13 2v12M3 4h8M5 8h8M3 12h8" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Align top"
                  aria-label="Align top"
                  onClick={() => alignSelected('h-top')}
                >
                  <svg viewBox="0 0 16 16" aria-hidden>
                    <path d="M2 3h12M4 5v8M8 5v6M12 5v8" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Align horizontal center"
                  aria-label="Align horizontal center"
                  onClick={() => alignSelected('h-center')}
                >
                  <svg viewBox="0 0 16 16" aria-hidden>
                    <path d="M2 8h12M4 2v12M8 4v8M12 2v12" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Align bottom"
                  aria-label="Align bottom"
                  onClick={() => alignSelected('h-bottom')}
                >
                  <svg viewBox="0 0 16 16" aria-hidden>
                    <path d="M2 13h12M4 3v8M8 5v8M12 3v8" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Distribute horizontal spacing"
                  aria-label="Distribute horizontal spacing"
                  onClick={() => distributeSelected('x')}
                >
                  <svg viewBox="0 0 16 16" aria-hidden>
                    <path d="M2 2v12M14 2v12M5 5h2v6H5zM9 5h2v6H9z" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Distribute vertical spacing"
                  aria-label="Distribute vertical spacing"
                  onClick={() => distributeSelected('y')}
                >
                  <svg viewBox="0 0 16 16" aria-hidden>
                    <path d="M2 2h12M2 14h12M5 5h6v2H5zM5 9h6v2H5z" />
                  </svg>
                </button>
              </>
            ) : null}
          </div>
        )}

        <div
          className="canvas-control-bubble"
          role="toolbar"
          aria-label={t('canvas.controlBubbleAria')}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="canvas-control-bubble-group" role="group" aria-label={t('canvas.historyGroupAria')}>
            <button
              type="button"
              className="canvas-control-bubble-btn"
              onClick={undo}
              disabled={!canUndo}
              title={t('canvas.undo')}
              aria-label={t('canvas.undo')}
            >
              <Undo2 className="w-4 h-4" strokeWidth={1.65} aria-hidden />
            </button>
            <button
              type="button"
              className="canvas-control-bubble-btn"
              onClick={redo}
              disabled={!canRedo}
              title={t('canvas.redo')}
              aria-label={t('canvas.redo')}
            >
              <Redo2 className="w-4 h-4" strokeWidth={1.65} aria-hidden />
            </button>
          </div>
          <span className="canvas-control-bubble-sep" aria-hidden />
          <div className="canvas-control-bubble-group" role="group" aria-label={t('canvas.viewGroupAria')}>
            <button
              type="button"
              className="canvas-control-bubble-btn"
              onClick={fitView}
              disabled={nodes.length === 0}
              title={t('canvas.fitView')}
              aria-label={t('canvas.fitView')}
            >
              <Scan className="w-4 h-4" strokeWidth={1.65} aria-hidden />
            </button>
          </div>
          <span className="canvas-control-bubble-sep" aria-hidden />
          <div className="canvas-control-bubble-group" role="group" aria-label={t('canvas.zoomGroupAria')}>
            <button
              type="button"
              className="canvas-control-bubble-btn"
              onClick={() => zoomFromViewportCenter(CANVAS_ZOOM_STEP)}
              disabled={viewport.scale >= CANVAS_SCALE_MAX - 1e-4}
              title={t('canvas.zoomIn')}
              aria-label={t('canvas.zoomIn')}
            >
              <ZoomIn className="w-4 h-4" strokeWidth={1.65} aria-hidden />
            </button>
            <button
              type="button"
              className="canvas-control-bubble-btn"
              onClick={() => zoomFromViewportCenter(1 / CANVAS_ZOOM_STEP)}
              disabled={viewport.scale <= CANVAS_SCALE_MIN + 1e-4}
              title={t('canvas.zoomOut')}
              aria-label={t('canvas.zoomOut')}
            >
              <ZoomOut className="w-4 h-4" strokeWidth={1.65} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div className="canvas-floating-bar" role="toolbar" aria-label={t('canvas.toolbarAria')}>
        <button
          type="button"
          onClick={addCardCenterVisible}
          className="canvas-floating-bar-btn canvas-floating-bar-btn--primary"
        >
          <Plus className="w-4 h-4" aria-hidden />
          {t('canvas.addCard')}
        </button>
        <button
          type="button"
          onClick={focusSelection}
          className="canvas-floating-bar-btn canvas-floating-bar-btn--secondary"
          disabled={selectedIds.length === 0}
          title={t('canvas.frameSelection')}
        >
          <Focus className="w-4 h-4" aria-hidden />
          {t('canvas.frameSelection')}
        </button>
      </div>
    </div>
  )
}

