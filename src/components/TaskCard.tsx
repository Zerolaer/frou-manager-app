import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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
  const priorityColors = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500', 
    low: 'bg-green-500',
    default: 'bg-gray-300'
  }

  const priorityColor = priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.default

  return (
    <Card
      className={cn(
        "task-card cursor-pointer transition-all duration-200 hover:shadow-md",
        isDragged && "is-dragging",
        isGhost && "opacity-30",
        className
      )}
      style={{
        backgroundColor: projectColor ? `${projectColor}10` : undefined,
        borderColor: projectColor ? `${projectColor}50` : undefined,
        ...style
      }}
      onContextMenu={onContextMenu}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Header with priority and tag */}
          <div className="flex items-center gap-2">
            {task.priority && (
              <div className={cn("w-2 h-2 rounded-full", priorityColor)} />
            )}
            {task.tag && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {task.tag}
              </Badge>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <h3 className="font-medium text-sm text-foreground line-clamp-2">
              {task.title}
            </h3>
            
            {/* Progress indicator */}
            {task.todos && Array.isArray(task.todos) && task.todos.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {task.todos.filter((todo: any) => todo.done).length}/{task.todos.length}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
