import React, { useMemo } from 'react'
import { format, isToday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Plus, CheckCircle, Circle, Clock, Flag } from 'lucide-react'
import type { TaskItem, Project } from '@/types/shared'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/constants'

interface MobileTasksDayProps {
  date: Date
  tasks: TaskItem[]
  projects: Project[]
  onAddTask: () => void
  onEditTask: (task: TaskItem) => void
  onToggleTaskStatus: (task: TaskItem) => void
  onDeleteTask: (task: TaskItem) => void
  onDuplicateTask: (task: TaskItem) => void
  onContextMenu: (e: React.MouseEvent, task: TaskItem) => void
}

export default function MobileTasksDay({
  date,
  tasks,
  projects,
  onAddTask,
  onEditTask,
  onToggleTaskStatus,
  onDeleteTask,
  onDuplicateTask,
  onContextMenu
}: MobileTasksDayProps) {
  const isCurrentDay = isToday(date)
  
  // Group tasks by status
  const { openTasks, closedTasks } = useMemo(() => {
    const open = tasks.filter(task => task.status === TASK_STATUSES.OPEN)
    const closed = tasks.filter(task => task.status === TASK_STATUSES.CLOSED)
    return { openTasks: open, closedTasks: closed }
  }, [tasks])

  // Get project color by ID
  const getProjectColor = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    return project?.color || '#e5e7eb'
  }

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case TASK_PRIORITIES.HIGH:
        return <Flag className="w-3 h-3 text-red-500" />
      case TASK_PRIORITIES.MEDIUM:
        return <Flag className="w-3 h-3 text-yellow-500" />
      case TASK_PRIORITIES.LOW:
        return <Flag className="w-3 h-3 text-green-500" />
      default:
        return null
    }
  }

  const renderTaskCard = (task: TaskItem) => {
    const isCompleted = task.status === TASK_STATUSES.CLOSED
    const projectColor = getProjectColor(task.project_id || '')
    const todosTotal = Array.isArray(task.todos) ? task.todos.length : 0
    const todosDone = Array.isArray(task.todos) ? task.todos.filter(t => t.done).length : 0

    return (
      <div
        key={task.id}
        className={`bg-white rounded-lg border-l-4 p-4 shadow-sm ${
          isCompleted ? 'opacity-60' : ''
        }`}
        style={{ borderLeftColor: projectColor }}
        onClick={() => onEditTask(task)}
      >
        <div className="flex items-start gap-3">
          {/* Status checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleTaskStatus(task)
            }}
            className="flex-shrink-0 mt-0.5"
          >
            {isCompleted ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />
            )}
          </button>

          {/* Task content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {task.title}
              </h3>
              
              {/* Priority and context menu */}
              <div className="flex items-center gap-1">
                {getPriorityIcon(task.priority)}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onContextMenu(e, task)
                  }}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <div className="w-4 h-4 rounded-full bg-gray-300" />
                </button>
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <p className={`text-sm mt-1 ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                {task.description}
              </p>
            )}

            {/* Task metadata */}
            <div className="flex items-center gap-3 mt-2">
              {/* Tag */}
              {task.tag && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {task.tag}
                </span>
              )}

              {/* Todos progress */}
              {todosTotal > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{todosDone}/{todosTotal}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* Date header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">
          {format(date, 'EEEE, d MMMM yyyy', { locale: ru })}
        </h2>
        {isCurrentDay && (
          <div className="text-sm text-blue-600 font-medium">Сегодня</div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-sm font-medium text-blue-600 mb-1">Всего</div>
          <div className="text-lg font-bold text-blue-700">{tasks.length}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-sm font-medium text-green-600 mb-1">Выполнено</div>
          <div className="text-lg font-bold text-green-700">{closedTasks.length}</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
          <div className="text-sm font-medium text-orange-600 mb-1">Активные</div>
          <div className="text-lg font-bold text-orange-700">{openTasks.length}</div>
        </div>
      </div>

      {/* Add task button */}
      <button
        onClick={onAddTask}
        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Добавить задачу
      </button>

      {/* Open tasks */}
      {openTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Активные задачи</h3>
          <div className="space-y-3">
            {openTasks.map(renderTaskCard)}
          </div>
        </div>
      )}

      {/* Completed tasks */}
      {closedTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Выполненные задачи</h3>
          <div className="space-y-3">
            {closedTasks.map(renderTaskCard)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет задач на этот день</h3>
          <p className="text-gray-500 mb-4">Добавьте первую задачу или перейдите к другому дню</p>
          <button
            onClick={onAddTask}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Добавить задачу
          </button>
        </div>
      )}
    </div>
  )
}

