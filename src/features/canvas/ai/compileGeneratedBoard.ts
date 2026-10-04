import { normalizeBoardState, type CanvasBoardState } from '../types'
import { layoutGeneratedBoard } from './layoutGeneratedBoard'
import { parseCanvasAiLayout, type CanvasAiLayout } from './schema'

export function compileGeneratedBoard(layout: CanvasAiLayout): CanvasBoardState {
  return normalizeBoardState(layoutGeneratedBoard(layout))
}

export function compileGeneratedBoardFromUnknown(raw: unknown): CanvasBoardState | null {
  const layout = parseCanvasAiLayout(raw)
  if (!layout) return null
  return compileGeneratedBoard(layout)
}
