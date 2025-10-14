import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getPriorityColor } from '@/lib/taskHelpers'

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
    normal: 'Normal',
    default: ''
  }

  const priorityLabel = priorityText[task.priority as keyof typeof priorityText] || priorityText.default
  const isCompleted = task.status === 'closed'

  return (
    <Card
      className={cn(
        "task-card group cursor-pointer transition-all duration-150 hover:shadow-md",
        isDragged && "is-dragging",
        isGhost && "opacity-30",
        isCompleted && "is-closed",
        className
      )}
      style={{
        backgroundColor: isCompleted ? '#F2F7FA' : '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
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
              {task.priority && priorityLabel ? (
                <span 
                  className="text-xs font-medium px-2 py-1"
                  style={{
                    backgroundColor: getPriorityColor(task.priority).background,
                    color: getPriorityColor(task.priority).text,
                    borderRadius: '999px'
                  }}
                >
                  {priorityLabel}
                </span>
              ) : (
                <div></div>
              )}
            </div>
            <button
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu?.(e);
              }}
            >
              <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <h3 className="font-medium text-sm text-black line-clamp-2 task-title">
              {task.title}
            </h3>
            
            {/* Теги */}
            {task.tag && (
              <div className="flex flex-wrap gap-1 mt-1">
                <span 
                  className="text-xs px-3 py-1 font-medium"
                  style={{ backgroundColor: '#e5e7eb', color: '#4b5563', borderRadius: '999px' }}
                >
                  {task.tag}
                </span>
              </div>
            )}

            {/* Прогресс бар для подзадач */}
            {task.todos && Array.isArray(task.todos) && task.todos.length > 0 && (
              <div className="space-y-1 mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Прогресс</span>
                  <span>{task.todos.filter((todo: any) => todo.done).length}/{task.todos.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-black h-1.5 rounded-full transition-all duration-200"
                    style={{ 
                      width: `${(task.todos.filter((todo: any) => todo.done).length / task.todos.length) * 100}%`,
                      opacity: task.todos.every((todo: any) => todo.done) ? 0.3 : 1
                    }}
                  />
                </div>
              </div>
            )}

            {/* Название проекта */}
            {task.project_name && (
              <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                {task.project_name}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
