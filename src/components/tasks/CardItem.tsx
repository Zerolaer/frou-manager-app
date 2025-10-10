/**
 * CardItem - Individual draggable task card
 * 
 * Features:
 * - Drag handle for better UX (doesn't conflict with clickable content)
 * - Full accessibility support with keyboard navigation
 * - Visual feedback during drag operations
 * - Support for pinned and disabled states
 */

import React, { useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pin } from 'lucide-react'

import { CardItemProps } from './types'

export function CardItem({
  card,
  dayId,
  index,
  onMove,
  onReorder,
  renderCard,
  getCardId,
  isDragging = false,
  isOverlay = false,
}: CardItemProps) {
  const cardId = getCardId(card)

  // Set up sortable functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
    isOver,
  } = useSortable({
    id: cardId,
    disabled: card.disabled,
  })

  // Combine transform styles
  const style = useMemo(() => {
    if (isOverlay) {
      return {
        transform: CSS.Transform.toString(transform),
        opacity: 0.8,
        zIndex: 1000,
      }
    }
    
    return {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isSortableDragging ? 0.5 : 1,
    }
  }, [transform, transition, isSortableDragging, isOverlay])

  // Handle keyboard events for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        // Start drag on Enter or Space
        event.preventDefault()
        // The sortable will handle the drag start
        break
      case 'Escape':
        // Cancel drag (handled by DndContext)
        break
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        card-item group relative
        ${isSortableDragging ? 'z-50' : ''}
        ${card.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
        ${isOver && !isSortableDragging ? 'ring-2 ring-blue-300' : ''}
      `}
      role="listitem"
      aria-label={`Задача: ${card.title}`}
      aria-describedby={`card-${cardId}-description`}
      aria-grabbed={isSortableDragging}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Drag Handle */}
      <div
        className={`
          drag-handle absolute left-0 top-0 w-6 h-full flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-opacity duration-200
          ${card.disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
          ${isSortableDragging ? 'opacity-100' : ''}
        `}
        {...attributes}
        {...listeners}
        aria-label="Перетащить задачу"
        role="button"
        tabIndex={-1}
      >
        <GripVertical 
          className="w-4 h-4 text-gray-400 hover:text-gray-600" 
          aria-hidden="true"
        />
      </div>

      {/* Card Content */}
      <div className={`
        card-content ml-6 transition-all duration-200
        ${isSortableDragging ? 'shadow-lg scale-105' : 'shadow-sm hover:shadow-md'}
        ${isOver && !isSortableDragging ? 'ring-2 ring-blue-300 bg-blue-50' : ''}
      `}>
        {/* Pinned indicator */}
        {card.pinned && (
          <div className="absolute -top-1 -right-1 z-10">
            <Pin 
              className="w-3 h-3 text-blue-500" 
              aria-label="Закрепленная задача"
            />
          </div>
        )}

        {/* Render card content */}
        {renderCard?.(card)}

        {/* Drop indicator for when hovering over this card */}
        {isOver && !isSortableDragging && (
          <div className="absolute inset-0 border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 text-xs font-medium">
              Вставить сюда
            </span>
          </div>
        )}
      </div>

      {/* Hidden description for screen readers */}
      <div 
        id={`card-${cardId}-description`}
        className="sr-only"
      >
        {card.meta && `Описание: ${card.meta}`}
        {card.pinned && 'Закрепленная задача'}
        {card.disabled && 'Задача отключена'}
        {isSortableDragging && 'Перетаскивается'}
      </div>

      {/* Focus indicator for keyboard navigation */}
      <div className="absolute inset-0 rounded-lg ring-2 ring-blue-500 ring-opacity-0 focus-within:ring-opacity-100 transition-all duration-200 pointer-events-none" />
    </div>
  )
}

// Memoized version for performance optimization
export const MemoizedCardItem = React.memo(CardItem, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.card.title === nextProps.card.title &&
    prevProps.card.meta === nextProps.card.meta &&
    prevProps.card.color === nextProps.card.color &&
    prevProps.card.pinned === nextProps.card.pinned &&
    prevProps.card.disabled === nextProps.card.disabled &&
    prevProps.dayId === nextProps.dayId &&
    prevProps.index === nextProps.index &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isOverlay === nextProps.isOverlay
  )
})
