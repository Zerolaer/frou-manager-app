/**
 * WeekBoard - Main drag & drop component for weekly task calendar
 * 
 * Architecture:
 * - Uses @dnd-kit/core for robust drag & drop functionality
 * - Implements optimistic UI updates with rollback on errors
 * - Full accessibility support with keyboard navigation
 * - Touch-friendly for mobile devices
 * - Modular design with customizable rendering
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragCancelEvent,
  UniqueIdentifier,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'

import { WeekBoardProps, DayColumnProps, DragState, AccessibilityAnnouncements } from './types'
import { DayColumn } from './DayColumn'
import { CardItem } from './CardItem'
import { DragOverlayContent } from './DragOverlay'

// Default accessibility announcements for screen readers
const defaultAnnouncements: AccessibilityAnnouncements = {
  onDragStart: (card, day) => `Started dragging ${card.title} from ${day.title || day.date}`,
  onDragOver: (card, day) => `Moved ${card.title} over ${day.title || day.date}`,
  onDragEnd: (card, day, success) => 
    success 
      ? `Successfully moved ${card.title} to ${day.title || day.date}`
      : `Failed to move ${card.title} to ${day.title || day.date}`,
  onCancel: (card, day) => `Cancelled moving ${card.title} from ${day.title || day.date}`,
}

export function WeekBoard({
  days,
  onMove,
  onReorder,
  renderCard,
  renderDayHeader,
  getCardId,
  className = '',
  allowDrop,
}: WeekBoardProps) {
  // Drag & drop state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedCard: null,
    sourceDay: null,
    sourceIndex: null,
    targetDay: null,
    targetIndex: null,
    isOptimistic: false,
    error: null,
  })

  // Optimistic state for immediate UI updates
  const [optimisticDays, setOptimisticDays] = useState<typeof days>(days)

  // Update optimistic state when props change (for external updates)
  React.useEffect(() => {
    setOptimisticDays(days)
  }, [days])

  // Configure drag sensors for different input methods
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Create sortable contexts for each day column
  const daySortableContexts = useMemo(() => {
    const contexts: Record<string, string[]> = {}
    optimisticDays.forEach(day => {
      contexts[day.id] = day.cards.map(getCardId)
    })
    return contexts
  }, [optimisticDays, getCardId])

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const cardId = active.id as string
    
    // Find the card and its position
    let foundCard = null
    let foundDay = null
    let foundIndex = -1

    for (const day of optimisticDays) {
      const index = day.cards.findIndex(card => getCardId(card) === cardId)
      if (index !== -1) {
        foundCard = day.cards[index]
        foundDay = day
        foundIndex = index
        break
      }
    }

    if (foundCard && foundDay) {
      setDragState({
        isDragging: true,
        draggedCard: foundCard,
        sourceDay: foundDay.id,
        sourceIndex: foundIndex,
        targetDay: foundDay.id,
        targetIndex: foundIndex,
        isOptimistic: false,
        error: null,
      })

      // Announce to screen readers
      const announcement = defaultAnnouncements.onDragStart?.(foundCard, foundDay)
      if (announcement) {
        // Create live region for announcement
        const liveRegion = document.createElement('div')
        liveRegion.setAttribute('aria-live', 'polite')
        liveRegion.setAttribute('aria-atomic', 'true')
        liveRegion.className = 'sr-only'
        liveRegion.textContent = announcement
        document.body.appendChild(liveRegion)
        
        // Remove after announcement
        setTimeout(() => {
          document.body.removeChild(liveRegion)
        }, 1000)
      }
    }
  }, [optimisticDays, getCardId])

  // Handle drag over (hovering over drop zones)
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    
    if (!over || !dragState.draggedCard) return

    const cardId = active.id as string
    const overId = over.id as string
    
    // Find target day and index
    let targetDay = null
    let targetIndex = -1

    // Check if hovering over a day column
    const targetDayData = optimisticDays.find(day => day.id === overId)
    if (targetDayData) {
      targetDay = targetDayData.id
      targetIndex = targetDayData.cards.length // Insert at end
    } else {
      // Check if hovering over a card
      for (const day of optimisticDays) {
        const cardIndex = day.cards.findIndex(card => getCardId(card) === overId)
        if (cardIndex !== -1) {
          targetDay = day.id
          targetIndex = cardIndex
          break
        }
      }
    }

    if (targetDay !== null && targetIndex !== -1) {
      setDragState(prev => ({
        ...prev,
        targetDay,
        targetIndex,
      }))
    }
  }, [dragState.draggedCard, optimisticDays, getCardId])

  // Handle drag end - perform the actual move/reorder
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    const { draggedCard, sourceDay, sourceIndex, targetDay, targetIndex } = dragState

    if (!draggedCard || !sourceDay || sourceIndex === null || !targetDay || targetIndex === null) {
      setDragState(prev => ({ ...prev, isDragging: false, draggedCard: null }))
      return
    }

    // Don't do anything if dropped in the same position
    if (sourceDay === targetDay && sourceIndex === targetIndex) {
      setDragState(prev => ({ ...prev, isDragging: false, draggedCard: null }))
      return
    }

    // Check if drop is allowed
    const targetDayData = optimisticDays.find(day => day.id === targetDay)
    if (targetDayData && allowDrop && !allowDrop(draggedCard, targetDayData)) {
      setDragState(prev => ({ ...prev, isDragging: false, draggedCard: null }))
      return
    }

    // Apply optimistic update immediately
    setOptimisticDays(prevDays => {
      const newDays = [...prevDays]
      
      // Remove from source
      const sourceDayIndex = newDays.findIndex(day => day.id === sourceDay)
      if (sourceDayIndex !== -1) {
        const sourceCards = [...newDays[sourceDayIndex].cards]
        const [removedCard] = sourceCards.splice(sourceIndex, 1)
        
        // Insert at target
        const targetDayIndex = newDays.findIndex(day => day.id === targetDay)
        if (targetDayIndex !== -1) {
          const targetCards = [...newDays[targetDayIndex].cards]
          targetCards.splice(targetIndex, 0, removedCard)
          
          newDays[sourceDayIndex] = { ...newDays[sourceDayIndex], cards: sourceCards }
          newDays[targetDayIndex] = { ...newDays[targetDayIndex], cards: targetCards }
        }
      }
      
      return newDays
    })

    setDragState(prev => ({ ...prev, isOptimistic: true }))

    try {
      // Determine if it's a move or reorder
      if (sourceDay === targetDay) {
        // Reorder within same day
        await onReorder({
          cardId: getCardId(draggedCard),
          day: sourceDay,
          fromIndex: sourceIndex,
          toIndex: targetIndex,
        })
      } else {
        // Move between days
        await onMove({
          cardId: getCardId(draggedCard),
          fromDay: sourceDay,
          fromIndex: sourceIndex,
          toDay: targetDay,
          toIndex: targetIndex,
        })
      }

      // Success - optimistic update was correct
      setDragState(prev => ({ ...prev, isDragging: false, draggedCard: null, isOptimistic: false }))
      
      // Announce success
      const targetDayData = optimisticDays.find(day => day.id === targetDay)
      if (targetDayData) {
        const announcement = defaultAnnouncements.onDragEnd?.(draggedCard, targetDayData, true)
        if (announcement) {
          const liveRegion = document.createElement('div')
          liveRegion.setAttribute('aria-live', 'polite')
          liveRegion.setAttribute('aria-atomic', 'true')
          liveRegion.className = 'sr-only'
          liveRegion.textContent = announcement
          document.body.appendChild(liveRegion)
          setTimeout(() => document.body.removeChild(liveRegion), 1000)
        }
      }

    } catch (error) {
      // Error - rollback optimistic update
      setOptimisticDays(days) // Restore original state
      setDragState(prev => ({ 
        ...prev, 
        isDragging: false, 
        draggedCard: null, 
        isOptimistic: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }))

      // Announce failure
      const sourceDayData = optimisticDays.find(day => day.id === sourceDay)
      if (sourceDayData) {
        const announcement = defaultAnnouncements.onDragEnd?.(draggedCard, sourceDayData, false)
        if (announcement) {
          const liveRegion = document.createElement('div')
          liveRegion.setAttribute('aria-live', 'assertive')
          liveRegion.setAttribute('aria-atomic', 'true')
          liveRegion.className = 'sr-only'
          liveRegion.textContent = announcement
          document.body.appendChild(liveRegion)
          setTimeout(() => document.body.removeChild(liveRegion), 1000)
        }
      }

      // TODO: Show toast notification for error
      console.error('Failed to move card:', error)
    }
  }, [dragState, optimisticDays, onMove, onReorder, getCardId, allowDrop, days])

  // Handle drag cancel (Escape key)
  const handleDragCancel = useCallback((event: DragCancelEvent) => {
    const { draggedCard, sourceDay } = dragState
    
    setDragState(prev => ({ ...prev, isDragging: false, draggedCard: null }))
    
    // Announce cancellation
    if (draggedCard && sourceDay) {
      const sourceDayData = optimisticDays.find(day => day.id === sourceDay)
      if (sourceDayData) {
        const announcement = defaultAnnouncements.onCancel?.(draggedCard, sourceDayData)
        if (announcement) {
          const liveRegion = document.createElement('div')
          liveRegion.setAttribute('aria-live', 'polite')
          liveRegion.setAttribute('aria-atomic', 'true')
          liveRegion.className = 'sr-only'
          liveRegion.textContent = announcement
          document.body.appendChild(liveRegion)
          setTimeout(() => document.body.removeChild(liveRegion), 1000)
        }
      }
    }
  }, [dragState, optimisticDays])

  return (
    <div className={`week-board ${className}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        modifiers={[restrictToWindowEdges]}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {optimisticDays.map((day) => (
            <DayColumn
              key={day.id}
              day={day}
              cards={day.cards}
              onMove={onMove}
              onReorder={onReorder}
              renderCard={renderCard}
              renderDayHeader={renderDayHeader}
              getCardId={getCardId}
              allowDrop={allowDrop}
              sortableContext={daySortableContexts[day.id]}
            />
          ))}
        </div>

        <DragOverlay>
          {dragState.draggedCard ? (
            <DragOverlayContent card={dragState.draggedCard} renderCard={renderCard} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Error display */}
      {dragState.error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm font-medium">Move failed</p>
              <p className="text-sm">{dragState.error}</p>
            </div>
            <button
              onClick={() => setDragState(prev => ({ ...prev, error: null }))}
              className="ml-4 text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to create array move utility
function arrayMoveUtil<T>(array: T[], from: number, to: number): T[] {
  const newArray = [...array]
  const [removed] = newArray.splice(from, 1)
  newArray.splice(to, 0, removed)
  return newArray
}
