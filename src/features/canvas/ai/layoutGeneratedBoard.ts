import {
  defaultBoardState,
  defaultNodeSize,
  type CanvasBoardState,
  type CanvasEdge,
  type CanvasNode,
  type CanvasSection,
} from '../types'
import type { CanvasAiLayout } from './schema'

const START_X = 80
const START_Y = 80
const COL_GAP = 56
const CARD_GAP = 24

export function layoutGeneratedBoard(layout: CanvasAiLayout): CanvasBoardState {
  const nodes: CanvasNode[] = []
  const sections: CanvasSection[] = []
  let cursorX = START_X

  for (const column of layout.columns) {
    let cursorY = START_Y
    let colWidth = 0
    const nodeIds: string[] = []

    for (const card of column.cards) {
      const size = defaultNodeSize(card.kind)
      const node: CanvasNode = {
        id: card.id,
        title: card.title,
        text: card.text,
        kind: card.kind,
        x: cursorX,
        y: cursorY,
        w: size.w,
        h: size.h,
        ...(card.accent ? { accent: card.accent } : {}),
      }
      nodes.push(node)
      nodeIds.push(node.id)
      colWidth = Math.max(colWidth, size.w)
      cursorY += size.h + CARD_GAP
    }

    if (nodeIds.length >= 2) {
      sections.push({
        id: column.id,
        title: column.title,
        nodeIds,
      })
    }

    cursorX += (colWidth || defaultNodeSize('card').w) + COL_GAP
  }

  const edges: CanvasEdge[] = layout.edges.map((e, i) => ({
    id: `edge_${e.from}_${e.to}_${i}`,
    from: e.from,
    to: e.to,
    fromSide: e.fromSide,
    toSide: e.toSide,
  }))

  return {
    nodes,
    edges,
    sections,
    viewport: defaultBoardState().viewport,
  }
}
