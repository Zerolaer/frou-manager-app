/**
 * DragOverlay - Visual feedback during drag operations
 * 
 * Features:
 * - Animated drag preview with shadow and rotation
 * - Customizable rendering for different card types
 * - Smooth transitions and visual feedback
 * - Accessibility support with live announcements
 */

import React from 'react'
import { Card, AccessibilityAnnouncements } from './types'
import { useTranslation } from 'react-i18next'

interface DragOverlayContentProps {
  card: Card
  renderCard?: (card: Card) => React.ReactNode
}

export function DragOverlayContent({ card, renderCard }: DragOverlayContentProps) {
  // Default card renderer for overlay
  const defaultCardRenderer = (card: Card) => (
    <div className="p-3 bg-white rounded-lg shadow-2xl border border-gray-200 transform rotate-2">
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
      className="drag-overlay-content"
      style={{
        transform: 'rotate(2deg)',
        filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.15))',
        opacity: 0.9,
      }}
      role="img"
      aria-label={`Перетаскивается: ${card.title}`}
    >
      {renderCard ? renderCard(card) : defaultCardRenderer(card)}
    </div>
  )
}

// Enhanced overlay with animations
export function AnimatedDragOverlay({ card, renderCard }: DragOverlayContentProps) {
  return (
    <div 
      className="drag-overlay-animated"
      style={{
        animation: 'dragOverlayPulse 0.3s ease-in-out',
        transform: 'rotate(2deg) scale(1.05)',
        filter: 'drop-shadow(0 15px 30px rgba(0, 0, 0, 0.2))',
        opacity: 0.95,
      }}
    >
      <DragOverlayContent card={card} renderCard={renderCard} />
    </div>
  )
}

// CSS animations (should be added to your global CSS or component styles)
export const dragOverlayStyles = `
  @keyframes dragOverlayPulse {
    0% {
      transform: rotate(0deg) scale(1);
      opacity: 0.8;
    }
    50% {
      transform: rotate(1deg) scale(1.02);
      opacity: 0.9;
    }
    100% {
      transform: rotate(2deg) scale(1.05);
      opacity: 0.95;
    }
  }

  .drag-overlay-content {
    transition: all 0.2s ease-out;
  }

  .drag-overlay-animated {
    animation: dragOverlayPulse 0.3s ease-in-out;
  }
`

// Accessibility announcements for drag overlay
export const createDragAnnouncements = (): AccessibilityAnnouncements => ({
  onDragStart: (card, day) => {
    const announcement = `Начато перетаскивание задачи "${card.title}" из колонки "${day.title || day.date}"`
    
    // Create live region for announcement
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    liveRegion.textContent = announcement
    document.body.appendChild(liveRegion)
    
    // Remove after announcement
    setTimeout(() => {
      if (document.body.contains(liveRegion)) {
        document.body.removeChild(liveRegion)
      }
    }, 1000)
    
    return announcement
  },
  
  onDragOver: (card, day) => {
    const announcement = `Задача "${card.title}" перемещена над колонкой "${day.title || day.date}"`
    
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    liveRegion.textContent = announcement
    document.body.appendChild(liveRegion)
    
    setTimeout(() => {
      if (document.body.contains(liveRegion)) {
        document.body.removeChild(liveRegion)
      }
    }, 500)
    
    return announcement
  },
  
  onDragEnd: (card, day, success) => {
    const announcement = success 
      ? `Задача "${card.title}" успешно перемещена в колонку "${day.title || day.date}"`
      : `Не удалось переместить задачу "${card.title}" в колонку "${day.title || day.date}"`
    
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', success ? 'polite' : 'assertive')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    liveRegion.textContent = announcement
    document.body.appendChild(liveRegion)
    
    setTimeout(() => {
      if (document.body.contains(liveRegion)) {
        document.body.removeChild(liveRegion)
      }
    }, 2000)
    
    return announcement
  },
  
  onCancel: (card, day) => {
    const announcement = `Перетаскивание задачи "${card.title}" отменено, возвращена в колонку "${day.title || day.date}"`
    
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    liveRegion.textContent = announcement
    document.body.appendChild(liveRegion)
    
    setTimeout(() => {
      if (document.body.contains(liveRegion)) {
        document.body.removeChild(liveRegion)
      }
    }, 1000)
    
    return announcement
  },
})
