/**
 * DayColumn - Individual day column in the week board
 * 
 * Features:
 * - Drop zone for cards
 * - Sortable context for reordering
 * - Visual feedback for drag operations
 * - Accessibility support
 */

import React, { useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { DayColumnProps, Card } from './types'
import { CardItem } from './CardItem'

export function DayColumn({
  day,
  cards,
  onMove,
  onReorder,
  renderCard,
  renderDayHeader,
  getCardId,
  allowDrop,
  sortableContext,
}: DayColumnProps & { sortableContext: string[] }) {
  // Set up droppable zone for the day column
  const { isOver, setNodeRef } = useDroppable({
    id: day.id,
    disabled: false,
  })

  // Memoize card IDs for sortable context
  const cardIds = useMemo(() => 
    sortableContext || cards.map(getCardId),
    [sortableContext, cards, getCardId]
  )

  // Default day header renderer
  const defaultDayHeader = (day: typeof day) => (
    <div className="flex flex-col items-center p-3 bg-gray-50 rounded-t-lg border-b">
      <div className="text-sm font-medium text-gray-700">
        {day.title || new Date(day.date).toLocaleDateString('ru-RU', { 
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        })}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {cards.length} задач
      </div>
    </div>
  )

  // Default card renderer
  const defaultCardRenderer = (card: Card) => (
    <div className={`p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${
      card.disabled ? 'opacity-50' : ''
    } ${card.pinned ? 'ring-2 ring-blue-300' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {card.title}
          </h4>
          {card.meta && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              {card.meta}
            </p>
          )}
        </div>
        {card.color && (
          <div 
            className="w-3 h-3 rounded-full ml-2 flex-shrink-0"
            style={{ backgroundColor: card.color }}
            aria-label={`Цвет задачи: ${card.color}`}
          />
        )}
      </div>
    </div>
  )

  return (
    <div 
      ref={setNodeRef}
      className={`
        day-column flex flex-col w-64 min-h-96 bg-white rounded-lg shadow-sm border border-gray-200
        transition-all duration-200
        ${isOver ? 'ring-2 ring-blue-300 bg-blue-50' : ''}
        ${cards.length === 0 ? 'border-dashed border-gray-300' : ''}
      `}
      role="list"
      aria-label={`Колонка дня ${day.title || day.date}`}
      aria-describedby={`day-${day.id}-count`}
    >
      {/* Day Header */}
      <div className="sticky top-0 z-10 bg-white rounded-t-lg">
        {renderDayHeader ? renderDayHeader(day) : defaultDayHeader(day)}
      </div>

      {/* Cards Container */}
      <div className="flex-1 p-2 space-y-2 min-h-32">
        <SortableContext 
          items={cardIds} 
          strategy={verticalListSortingStrategy}
        >
          {cards.length === 0 ? (
            <div 
              className="flex items-center justify-center h-32 text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-lg"
              role="listitem"
              aria-label="Пустая колонка"
            >
              Перетащите задачу сюда
            </div>
          ) : (
            cards.map((card, index) => (
              <CardItem
                key={getCardId(card)}
                card={card}
                dayId={day.id}
                index={index}
                onMove={onMove}
                onReorder={onReorder}
                renderCard={renderCard || defaultCardRenderer}
                getCardId={getCardId}
              />
            ))
          )}
        </SortableContext>

        {/* Drop indicator when hovering over empty space */}
        {isOver && cards.length === 0 && (
          <div className="h-32 border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 text-sm font-medium">
              Отпустите для добавления
            </span>
          </div>
        )}
      </div>

      {/* Hidden element for screen readers */}
      <div 
        id={`day-${day.id}-count`}
        className="sr-only"
        aria-live="polite"
      >
        {cards.length === 0 
          ? `Колонка ${day.title || day.date} пуста`
          : `Колонка ${day.title || day.date} содержит ${cards.length} задач`
        }
      </div>
    </div>
  )
}
