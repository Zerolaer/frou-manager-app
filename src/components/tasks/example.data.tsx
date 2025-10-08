/**
 * Example data and usage demo for WeekBoard component
 * 
 * This file demonstrates:
 * - Sample data structure
 * - Integration with backend API
 * - Error handling and optimistic updates
 * - Custom rendering functions
 */

import React, { useState, useCallback } from 'react'
import { WeekBoard } from './WeekBoard'
import { Card, Day, MoveOperation, ReorderOperation } from './types'

// Sample data for demonstration
export const sampleDays: Day[] = [
  {
    id: 'monday',
    date: '2024-01-15',
    title: 'Понедельник',
    cards: [
      {
        id: 'task-1',
        title: 'Планирование спринта',
        meta: '9:00 - 10:00',
        color: '#3B82F6',
        pinned: false,
        disabled: false,
      },
      {
        id: 'task-2',
        title: 'Code review',
        meta: '14:00 - 15:00',
        color: '#10B981',
        pinned: true,
        disabled: false,
      },
    ],
  },
  {
    id: 'tuesday',
    date: '2024-01-16',
    title: 'Вторник',
    cards: [
      {
        id: 'task-3',
        title: 'Разработка фичи',
        meta: '10:00 - 16:00',
        color: '#F59E0B',
        pinned: false,
        disabled: false,
      },
      {
        id: 'task-4',
        title: 'Тестирование',
        meta: '16:00 - 17:00',
        color: '#EF4444',
        pinned: false,
        disabled: false,
      },
    ],
  },
  {
    id: 'wednesday',
    date: '2024-01-17',
    title: 'Среда',
    cards: [
      {
        id: 'task-5',
        title: 'Документация',
        meta: '11:00 - 12:00',
        color: '#8B5CF6',
        pinned: false,
        disabled: true, // Disabled task example
      },
    ],
  },
  {
    id: 'thursday',
    date: '2024-01-18',
    title: 'Четверг',
    cards: [
      {
        id: 'task-6',
        title: 'Деплой в продакшн',
        meta: '15:00 - 16:00',
        color: '#06B6D4',
        pinned: true,
        disabled: false,
      },
    ],
  },
  {
    id: 'friday',
    date: '2024-01-19',
    title: 'Пятница',
    cards: [
      {
        id: 'task-7',
        title: 'Ретроспектива',
        meta: '17:00 - 18:00',
        color: '#84CC16',
        pinned: false,
        disabled: false,
      },
    ],
  },
]

// Mock API functions (replace with your actual API calls)
export const mockApi = {
  // Move task between days
  moveTask: async (move: MoveOperation): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Simulate occasional errors (10% chance)
    if (Math.random() < 0.1) {
      throw new Error('Ошибка сети: не удалось переместить задачу')
    }
    
    
    // TODO: Replace with actual API call
    // await fetch('/api/tasks/move', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(move)
    // })
  },

  // Reorder task within same day
  reorderTask: async (reorder: ReorderOperation): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Simulate occasional errors (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Ошибка сети: не удалось изменить порядок задач')
    }
    
    
    // TODO: Replace with actual API call
    // await fetch('/api/tasks/reorder', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(reorder)
    // })
  },
}

// Custom card renderer with enhanced styling
export const customCardRenderer = (card: Card) => (
  <div className={`
    p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200
    ${card.disabled ? 'opacity-50 bg-gray-50' : ''}
    ${card.pinned ? 'ring-2 ring-blue-300 bg-blue-50' : ''}
    group
  `}>
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <h4 className={`
          text-sm font-medium truncate
          ${card.disabled ? 'text-gray-500' : 'text-gray-900'}
        `}>
          {card.title}
        </h4>
        {card.meta && (
          <p className="text-xs text-gray-500 mt-1 truncate">
            {card.meta}
          </p>
        )}
      </div>
      <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
        {card.pinned && (
          <div className="w-2 h-2 bg-blue-500 rounded-full" title="Закрепленная задача" />
        )}
        {card.color && (
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: card.color }}
            title={`Цвет задачи: ${card.color}`}
          />
        )}
      </div>
    </div>
  </div>
)

// Custom day header renderer
export const customDayHeaderRenderer = (day: Day) => (
  <div className="flex flex-col items-center p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg border-b">
    <div className="text-sm font-semibold text-gray-800">
      {day.title || new Date(day.date).toLocaleDateString('ru-RU', { 
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      })}
    </div>
    <div className="text-xs text-gray-600 mt-1 flex items-center space-x-1">
      <span>{day.cards.length}</span>
      <span>задач</span>
    </div>
  </div>
)

// Example usage component
export function WeekBoardDemo() {
  const [days, setDays] = useState<Day[]>(sampleDays)
  const [isLoading, setIsLoading] = useState(false)

  // Handle task movement between days
  const handleMove = useCallback(async (move: MoveOperation) => {
    setIsLoading(true)
    try {
      await mockApi.moveTask(move)
      
      // Update local state (optimistic update already handled by WeekBoard)
      
      // TODO: Refresh data from server if needed
      // const updatedDays = await fetchDaysFromServer()
      // setDays(updatedDays)
      
    } catch (error) {
      console.error('Failed to move task:', error)
      // Error handling is done by WeekBoard component
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle task reordering within same day
  const handleReorder = useCallback(async (reorder: ReorderOperation) => {
    setIsLoading(true)
    try {
      await mockApi.reorderTask(reorder)
      
      // Update local state (optimistic update already handled by WeekBoard)
      
      // TODO: Refresh data from server if needed
      // const updatedDays = await fetchDaysFromServer()
      // setDays(updatedDays)
      
    } catch (error) {
      console.error('Failed to reorder task:', error)
      // Error handling is done by WeekBoard component
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Custom allowDrop function - example: don't allow moving to Wednesday
  const allowDrop = useCallback((card: Card, targetDay: Day) => {
    // Don't allow moving disabled tasks
    if (card.disabled) return false
    
    // Don't allow moving to Wednesday (example business rule)
    if (targetDay.id === 'wednesday') return false
    
    // Don't allow moving pinned tasks to Friday
    if (card.pinned && targetDay.id === 'friday') return false
    
    return true
  }, [])

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          WeekBoard Demo
        </h1>
        <p className="text-gray-600">
          Перетаскивайте задачи между днями. Попробуйте перетащить закрепленную задачу в пятницу - это будет запрещено.
        </p>
        {isLoading && (
          <div className="mt-2 text-sm text-blue-600">
            Синхронизация с сервером...
          </div>
        )}
      </div>

      <WeekBoard
        days={days}
        onMove={handleMove}
        onReorder={handleReorder}
        renderCard={customCardRenderer}
        renderDayHeader={customDayHeaderRenderer}
        getCardId={(card) => card.id}
        allowDrop={allowDrop}
        className="week-board-demo"
      />

      {/* Instructions */}
      <div className="mt-8 p-4 bg-white rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Инструкции по использованию
        </h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Перетаскивайте задачи между колонками для перемещения</li>
          <li>• Перетаскивайте задачи внутри колонки для изменения порядка</li>
          <li>• Используйте клавиатуру для навигации (Tab, Enter, Escape)</li>
          <li>• Закрепленные задачи (синее кольцо) нельзя перемещать в пятницу</li>
          <li>• Отключенные задачи (серые) нельзя перемещать</li>
          <li>• Нельзя перемещать задачи в среду</li>
        </ul>
      </div>
    </div>
  )
}

// Helper function to create new days data
export const createNewDays = (): Day[] => [
  {
    id: 'monday',
    date: new Date().toISOString().split('T')[0],
    title: 'Понедельник',
    cards: [],
  },
  {
    id: 'tuesday',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    title: 'Вторник',
    cards: [],
  },
  {
    id: 'wednesday',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    title: 'Среда',
    cards: [],
  },
  {
    id: 'thursday',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    title: 'Четверг',
    cards: [],
  },
  {
    id: 'friday',
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    title: 'Пятница',
    cards: [],
  },
]
