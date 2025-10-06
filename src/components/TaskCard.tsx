import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Функция для затемнения цвета (делает цвет темнее)
function darkenColor(hex: string, factor: number = 0.3): string {
  // Убираем # если есть
  hex = hex.replace('#', '')
  
  // Конвертируем в RGB
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Затемняем каждый канал
  const darkenedR = Math.floor(r * (1 - factor))
  const darkenedG = Math.floor(g * (1 - factor))
  const darkenedB = Math.floor(b * (1 - factor))
  
  // Конвертируем обратно в hex
  return `#${darkenedR.toString(16).padStart(2, '0')}${darkenedG.toString(16).padStart(2, '0')}${darkenedB.toString(16).padStart(2, '0')}`
}

// Пастельная палитра цветов как на картинке
const PASTEL_COLORS = [
  { light: '#e8eaf6', dark: '#3f51b5' }, // светло-фиолетовый
  { light: '#fff3e0', dark: '#ff9800' }, // светло-оранжевый  
  { light: '#e8f5e8', dark: '#4caf50' }, // светло-зеленый
  { light: '#e3f2fd', dark: '#2196f3' }, // светло-голубой
  { light: '#fce4ec', dark: '#e91e63' }, // светло-розовый
  { light: '#f3e5f5', dark: '#9c27b0' }, // светло-фиолетовый
  { light: '#e0f2f1', dark: '#009688' }, // светло-бирюзовый
  { light: '#fff8e1', dark: '#ffc107' }, // светло-желтый
]

// Функция для получения пастельного цвета на основе ID задачи
function getPastelColor(taskId: string): { light: string, dark: string } {
  const hash = taskId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length]
}

// Функция для получения цвета приоритета
function getPriorityColor(priority: string): { background: string, text: string } {
  switch (priority) {
    case 'high':
      return { background: '#fee2e2', text: '#dc2626' } // красный
    case 'medium':
      return { background: '#fed7aa', text: '#ea580c' } // оранжевый
    case 'low':
      return { background: '#dcfce7', text: '#16a34a' } // зеленый
    default:
      return { background: '#f3f4f6', text: '#6b7280' } // серый по умолчанию
  }
}

interface TaskCardProps {
  task: any
  isDragged?: boolean
  isGhost?: boolean
  projectColor?: string
  onContextMenu?: (e: React.MouseEvent) => void
  onMouseDown?: (e: React.MouseEvent) => void
  onClick?: (e: React.MouseEvent) => void
  style?: React.CSSProperties
  className?: string
}

export function TaskCard({
  task,
  isDragged = false,
  isGhost = false,
  projectColor,
  onContextMenu,
  onMouseDown,
  onClick,
  style,
  className
}: TaskCardProps) {
  const priorityText = {
    high: 'High',
    medium: 'Medium', 
    low: 'Low',
    default: ''
  }

  const priorityLabel = priorityText[task.priority as keyof typeof priorityText] || priorityText.default
  const isCompleted = task.status === 'closed'

  return (
    <Card
      className={cn(
        "task-card group cursor-pointer transition-shadow duration-200 hover:shadow-md",
        isDragged && "is-dragging",
        isGhost && "opacity-30",
        isCompleted && "is-closed",
        className
      )}
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        ...style
      }}
      onContextMenu={onContextMenu}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Header with priority and three dots */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {task.priority && priorityLabel && (
                <span 
                  className="text-xs font-medium px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: getPriorityColor(task.priority).background,
                    color: getPriorityColor(task.priority).text
                  }}
                >
                  {priorityLabel}
                </span>
              )}
            </div>
            <button
              className="p-1 rounded hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu?.(e);
              }}
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </div>
            </button>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <h3 className="font-medium text-sm text-black line-clamp-2 task-title">
              {task.title}
            </h3>
            
            {/* Саб-задачи - убраны */}
            
            {/* Progress indicator - упрощен */}
            {task.todos && Array.isArray(task.todos) && task.todos.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {task.todos.filter((todo: any) => todo.done).length}/{task.todos.length}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
