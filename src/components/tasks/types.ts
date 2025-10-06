/**
 * Types for WeekBoard drag & drop functionality
 * 
 * Architecture decision: Using @dnd-kit because:
 * 1. Excellent accessibility support (keyboard navigation, screen readers)
 * 2. Built-in touch support for mobile devices
 * 3. Smooth animations and performance optimizations
 * 4. Modular design - can extend with plugins
 * 5. TypeScript-first with excellent type safety
 */

export interface Card {
  id: string
  title: string
  meta?: string
  color?: string
  pinned?: boolean
  disabled?: boolean
}

export interface Day {
  id: string
  date: string
  title?: string
  cards: Card[]
}

export interface MoveOperation {
  cardId: string
  fromDay: string
  fromIndex: number
  toDay: string
  toIndex: number
}

export interface ReorderOperation {
  cardId: string
  day: string
  fromIndex: number
  toIndex: number
}

export interface WeekBoardProps {
  days: Day[]
  onMove: (move: MoveOperation) => Promise<void>
  onReorder: (reorder: ReorderOperation) => Promise<void>
  renderCard?: (card: Card) => React.ReactNode
  renderDayHeader?: (day: Day) => React.ReactNode
  getCardId: (card: Card) => string
  className?: string
  allowDrop?: (card: Card, targetDay: Day) => boolean
}

export interface DayColumnProps {
  day: Day
  cards: Card[]
  onMove: (move: MoveOperation) => Promise<void>
  onReorder: (reorder: ReorderOperation) => Promise<void>
  renderCard?: (card: Card) => React.ReactNode
  renderDayHeader?: (day: Day) => React.ReactNode
  getCardId: (card: Card) => string
  allowDrop?: (card: Card, targetDay: Day) => boolean
}

export interface CardItemProps {
  card: Card
  dayId: string
  index: number
  onMove: (move: MoveOperation) => Promise<void>
  onReorder: (reorder: ReorderOperation) => Promise<void>
  renderCard?: (card: Card) => React.ReactNode
  getCardId: (card: Card) => string
  isDragging?: boolean
  isOverlay?: boolean
}

// Drag & Drop state for optimistic updates
export interface DragState {
  isDragging: boolean
  draggedCard: Card | null
  sourceDay: string | null
  sourceIndex: number | null
  targetDay: string | null
  targetIndex: number | null
  isOptimistic: boolean
  error: string | null
}

// Accessibility announcements for screen readers
export interface AccessibilityAnnouncements {
  onDragStart?: (card: Card, day: Day) => string
  onDragOver?: (card: Card, day: Day) => string
  onDragEnd?: (card: Card, day: Day, success: boolean) => string
  onCancel?: (card: Card, day: Day) => string
}

// Configuration for auto-scroll behavior
export interface AutoScrollConfig {
  enabled: boolean
  threshold: number
  speed: number
}

// Performance optimization config
export interface PerformanceConfig {
  enableVirtualization: boolean
  virtualThreshold: number
  batchUpdates: boolean
  debounceMs: number
}
