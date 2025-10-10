import React, { useMemo } from 'react'
import { format, isToday } from 'date-fns'
import { Plus, CheckCircle, Circle, Clock, Flag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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

  const getPriorityText = (priority?: string | null) => {
    switch (priority) {
      case TASK_PRIORITIES.HIGH:
        return "High"
      case TASK_PRIORITIES.MEDIUM:
        return "Medium"
      case TASK_PRIORITIES.LOW:
        return "Low"
      default:
        return null
    }
  }

  const getPriorityColor = (priority?: string | null): { background: string, text: string } => {
    switch (priority) {
      case TASK_PRIORITIES.HIGH:
        return { background: '#fee2e2', text: '#dc2626' } // red
      case TASK_PRIORITIES.MEDIUM:
        return { background: '#fed7aa', text: '#ea580c' } // orange
      case TASK_PRIORITIES.LOW:
        return { background: '#dcfce7', text: '#16a34a' } // green
      default:
        return { background: '#f3f4f6', text: '#6b7280' } // gray default
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
        className={`bg-white rounded-xl border-l-4 p-4 shadow-sm group transition-all duration-150 hover:border-black ${
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
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getPriorityText(task.priority) ? (
                  <span 
                    className="text-xs font-medium px-2 py-1 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: getPriorityColor(task.priority).background,
                      color: getPriorityColor(task.priority).text
                    }}
                  >
                    {getPriorityText(task.priority)}
                  </span>
                ) : (
                  <div></div>
                )}
                <h3 className={`font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'} flex-1 min-w-0`}>
                  {task.title}
                </h3>
              </div>
              
              {/* Context menu button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onContextMenu(e, task)
                }}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 flex-shrink-0 opacity-0 group-hover:opacity-100"
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </div>
              </button>
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
                <span 
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: '#e5e7eb',
                    color: '#4b5563'
                  }}
                >
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

            {/* Progress bar for subtasks */}
            {todosTotal > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-black h-1.5 rounded-full transition-all duration-200"
                    style={{ 
                      width: `${(todosDone / todosTotal) * 100}%`,
                      opacity: todosDone === todosTotal ? 0.3 : 1
                    }}
                  />
                </div>
              </div>
            )}

            {/* Project name */}
            {task.project_name && (
              <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                {task.project_name}
              </div>
            )}
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
          {format(date, 'EEEE, d MMMM yyyy')}
        </h2>
        {isCurrentDay && (
          <div className="text-sm text-blue-600 font-medium">{t('common.today')}</div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-sm font-medium text-blue-600 mb-1">{t('tasks.total')}</div>
          <div className="text-lg font-bold text-blue-700">{tasks.length}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-sm font-medium text-green-600 mb-1">{t('tasks.completed')}</div>
          <div className="text-lg font-bold text-green-700">{closedTasks.length}</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
          <div className="text-sm font-medium text-orange-600 mb-1">{t('tasks.active')}</div>
          <div className="text-lg font-bold text-orange-700">{openTasks.length}</div>
        </div>
      </div>

      {/* Add task button */}
      <button
        onClick={onAddTask}
        className="w-full flex items-center justify-center gap-2 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
      >
        <Plus className="w-5 h-5" />
        {t('tasks.addTask')}
      </button>

      {/* Open tasks */}
      {openTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('tasks.activeTasks')}</h3>
          <div className="space-y-3">
            {openTasks.map(renderTaskCard)}
          </div>
        </div>
      )}

      {/* Completed tasks */}
      {closedTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('tasks.completedTasks')}</h3>
          <div className="space-y-3">
            {closedTasks.map(renderTaskCard)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('tasks.noTasksThisDay')}</h3>
          <p className="text-gray-500 mb-4">{t('tasks.addFirstTaskOrNavigate')}</p>
          <button
            onClick={onAddTask}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('tasks.addTask')}
          </button>
        </div>
      )}
    </div>
  )
}

