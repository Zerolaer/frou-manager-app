import React, { useState } from 'react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns'
import type { TaskItem } from '@/types/shared'
import { Circle, Calendar, MoreVertical, CheckCircle2 } from 'lucide-react'
import { TASK_STATUSES } from '@/lib/constants'

interface TasksListViewProps {
  tasks: Record<string, TaskItem[]>
  start: Date
  onTaskClick: (task: TaskItem) => void
  onTaskUpdate: (task: any | null, isSave?: boolean) => Promise<void>
  t: (key: string) => string
}

export default function TasksListView({ tasks, start, onTaskClick, onTaskUpdate, t }: TasksListViewProps) {
  const [hoveredTask, setHoveredTask] = useState<string | null>(null)

  // Get all days in the week
  const weekStart = startOfWeek(start, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(start, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Collect all tasks from the week
  const weekTasks: TaskItem[] = []
  weekDays.forEach(day => {
    const dayKey = format(day, 'yyyy-MM-dd')
    const dayTasks = tasks[dayKey] || []
    weekTasks.push(...dayTasks)
  })

  // Group tasks by status/category
  // In Progress: open tasks that are not high priority (or all open if no high priority)
  const inProgressTasks = weekTasks.filter(t => 
    t.status === TASK_STATUSES.OPEN && t.priority !== 'high'
  )
  // Reviews: open tasks with high priority
  const reviewsTasks = weekTasks.filter(t => 
    t.status === TASK_STATUSES.OPEN && t.priority === 'high'
  )
  // Completed: closed tasks
  const completedTasks = weekTasks.filter(t => t.status === TASK_STATUSES.CLOSED)

  // Sort each group by date
  const sortByDate = (a: TaskItem, b: TaskItem) => {
    if (a.date && b.date) {
      return a.date.localeCompare(b.date)
    }
    return 0
  }

  inProgressTasks.sort(sortByDate)
  reviewsTasks.sort(sortByDate)
  completedTasks.sort(sortByDate)

  const formatTaskDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    try {
      const date = parseISO(dateStr)
      return format(date, 'MMM d, yyyy')
    } catch {
      return dateStr
    }
  }

  const getTagColor = (tag: string | null | undefined) => {
    if (!tag) return { bg: '#e5e7eb', text: '#4b5563' }
    // Simple hash for consistent colors
    const colors = [
      { bg: '#e8eaf6', text: '#3f51b5' }, // purple
      { bg: '#e8f5e8', text: '#4caf50' }, // green
      { bg: '#fff3e0', text: '#ff9800' }, // orange
      { bg: '#e3f2fd', text: '#2196f3' }, // blue
      { bg: '#fce4ec', text: '#e91e63' }, // pink
      { bg: '#f3e5f5', text: '#9c27b0' }, // purple
    ]
    const hash = tag.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    return colors[Math.abs(hash) % colors.length]
  }

  const TaskItemCard = ({ task }: { task: TaskItem }) => {
    const tagColor = getTagColor(task.tag)
    const isHovered = hoveredTask === task.id
    const isCompleted = task.status === TASK_STATUSES.CLOSED

    return (
      <div
        className="task-list-item bg-white border-b border-gray-100 py-3 px-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onMouseEnter={() => setHoveredTask(task.id)}
        onMouseLeave={() => setHoveredTask(null)}
        onClick={() => onTaskClick(task)}
      >
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <div className="flex-shrink-0">
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300" />
            )}
          </div>

          {/* Task Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h4 className={`text-sm font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                {task.title}
              </h4>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Date */}
              {task.date && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatTaskDate(task.date)}</span>
                </div>
              )}

              {/* Tags */}
              {task.tag && (
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: tagColor.bg,
                      color: tagColor.text,
                    }}
                  >
                    {task.tag}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Menu Button */}
          <div className="flex-shrink-0">
            <button
              className={`w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={(e) => {
                e.stopPropagation()
                // TODO: Open context menu
              }}
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const Column = ({ 
    title, 
    icon, 
    iconColor, 
    tasks, 
    emptyText 
  }: { 
    title: string
    icon: React.ReactNode
    iconColor: string
    tasks: TaskItem[]
    emptyText: string
  }) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: iconColor }}></div>
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>
        <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          {tasks.length}
        </span>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length > 0 ? (
          <div>
            {tasks.map(task => (
              <TaskItemCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="tasks-list-view">
      <div className="grid grid-cols-3 h-full divide-x divide-gray-200 bg-white">
        {/* In Progress */}
        <Column
          title={t('tasks.inProgress') || 'In Progress'}
          icon={<Circle className="w-2 h-2" />}
          iconColor="#3b82f6"
          tasks={inProgressTasks}
          emptyText={t('tasks.noInProgressTasks') || 'No tasks in progress'}
        />

        {/* Reviews */}
        <Column
          title={t('tasks.reviews') || 'Reviews'}
          icon={<Circle className="w-2 h-2" />}
          iconColor="#f59e0b"
          tasks={reviewsTasks}
          emptyText={t('tasks.noReviewTasks') || 'No tasks in review'}
        />

        {/* Completed */}
        <Column
          title={t('tasks.completed') || 'Completed'}
          icon={<CheckCircle2 className="w-2 h-2" />}
          iconColor="#10b981"
          tasks={completedTasks}
          emptyText={t('tasks.noCompletedTasks') || 'No completed tasks'}
        />
      </div>
    </div>
  )
}

