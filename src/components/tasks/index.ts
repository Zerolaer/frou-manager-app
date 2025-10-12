/**
 * WeekBoard - Drag & Drop Weekly Task Calendar
 * 
 * Main exports for the WeekBoard component system
 */

export { WeekBoard } from './WeekBoard'
export { DayColumn } from './DayColumn'
export { CardItem, MemoizedCardItem } from './CardItem'
export { DragOverlayContent, AnimatedDragOverlay, createDragAnnouncements } from './DragOverlay'

// Types
export type {
  Card,
  Day,
  MoveOperation,
  ReorderOperation,
  WeekBoardProps,
  DayColumnProps,
  CardItemProps,
  DragState,
  AccessibilityAnnouncements,
  AutoScrollConfig,
  PerformanceConfig,
} from './types'

// Styles (import in your main CSS file)
export { dragOverlayStyles } from './DragOverlay'

// CSS file path for import
export const WEEK_BOARD_CSS_PATH = './WeekBoard.css' // Note: CSS file removed for production
