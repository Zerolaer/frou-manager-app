import type { CanvasEdge, CanvasNode, CanvasSection } from '@/features/canvas/types'

export type BoardHistorySnapshot = {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  sections: CanvasSection[]
}

export function cloneBoardSnapshot(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  sections: CanvasSection[]
): BoardHistorySnapshot {
  return {
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
    sections: structuredClone(sections),
  }
}

export const MAX_BOARD_HISTORY = 60
