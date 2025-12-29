import React, { useState, useRef, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, differenceInDays, addDays, parseISO } from 'date-fns'
import type { TaskItem } from '@/types/shared'
import { supabase } from '@/lib/supabaseClient'
import TaskCard from '../TaskCard'

interface TasksGanttViewProps {
  tasks: Record<string, TaskItem[]>
  start: Date
  onTaskClick: (task: TaskItem) => void
  onTaskUpdate: (task: any | null, isSave?: boolean) => Promise<void>
  t: (key: string) => string
}

export default function TasksGanttView({ tasks, start, onTaskClick, onTaskUpdate, t }: TasksGanttViewProps) {
  const [draggedTask, setDraggedTask] = useState<TaskItem | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const ganttRef = useRef<HTMLDivElement>(null)

  // Get all days in the week
  const weekStart = startOfWeek(start, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(start, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Collect all tasks from the week - use start_date/due_date if available, otherwise use date
  const ganttTasks = React.useMemo(() => {
    const allTasks: TaskItem[] = []
    Object.values(tasks).flat().forEach(task => {
      // Include task if it has start_date/due_date, or if it has a date within the week
      if (task.start_date || task.due_date || task.date) {
        allTasks.push(task)
      }
    })
    return allTasks
  }, [tasks])

  // Calculate task position and width
  const getTaskPosition = (task: TaskItem) => {
    // Use start_date if available, otherwise use date
    const taskStartDate = task.start_date || task.date
    if (!taskStartDate) return { left: 0, width: 0 }
    
    const startDate = parseISO(taskStartDate)
    const dueDate = task.due_date ? parseISO(task.due_date) : (task.date ? parseISO(task.date) : startDate)
    const daysFromWeekStart = differenceInDays(startDate, weekStart)
    const taskDuration = differenceInDays(dueDate, startDate) + 1
    
    const dayWidth = 100 / 7 // Each day is ~14.28% of width
    const left = daysFromWeekStart * dayWidth
    const width = taskDuration * dayWidth

    // Only show tasks that are within or overlap the week
    if (daysFromWeekStart + taskDuration < 0 || daysFromWeekStart > 7) {
      return { left: 0, width: 0, visible: false }
    }

    return { left: Math.max(0, left), width: Math.max(dayWidth, width), visible: true }
  }

  const handleTaskDragStart = (e: React.MouseEvent, task: TaskItem) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggedTask(task)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const handleTaskDrag = React.useCallback((e: MouseEvent) => {
    if (!draggedTask || !ganttRef.current) return

    const ganttRect = ganttRef.current.getBoundingClientRect()
    const ganttBody = ganttRef.current.querySelector('.gantt-body')
    if (!ganttBody) return

    const bodyRect = ganttBody.getBoundingClientRect()
    const relativeX = e.clientX - bodyRect.left - 200 // Subtract left column width
    const dayWidth = (bodyRect.width - 200) / 7
    const dayIndex = Math.max(0, Math.min(6, Math.floor(relativeX / dayWidth)))
    const newStartDate = addDays(weekStart, dayIndex)
    
    // Calculate task duration
    const currentStart = draggedTask.start_date || draggedTask.date
    const currentDue = draggedTask.due_date || draggedTask.date || currentStart
    const taskDuration = currentStart && currentDue
      ? differenceInDays(parseISO(currentDue), parseISO(currentStart))
      : 0
    const newDueDate = addDays(newStartDate, taskDuration)

    // Update in database
    supabase
      .from('tasks_items')
      .update({
        start_date: format(newStartDate, 'yyyy-MM-dd'),
        due_date: format(newDueDate, 'yyyy-MM-dd')
      })
      .eq('id', draggedTask.id)
      .then(() => {
        onTaskUpdate({
          ...draggedTask,
          start_date: format(newStartDate, 'yyyy-MM-dd'),
          due_date: format(newDueDate, 'yyyy-MM-dd')
        }, false)
      })
  }, [draggedTask, weekStart, onTaskUpdate])

  const handleTaskDragEnd = React.useCallback(() => {
    setDraggedTask(null)
    setDragOffset({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    if (!draggedTask) return

    document.addEventListener('mousemove', handleTaskDrag)
    document.addEventListener('mouseup', handleTaskDragEnd)
    
    return () => {
      document.removeEventListener('mousemove', handleTaskDrag)
      document.removeEventListener('mouseup', handleTaskDragEnd)
    }
  }, [draggedTask, handleTaskDrag, handleTaskDragEnd])

  return (
    <div className="tasks-gantt-view" ref={ganttRef}>
      {/* Header with days */}
      <div className="gantt-header">
        <div className="gantt-header-left">
          <div className="gantt-header-cell">{t('tasks.task') || 'Task'}</div>
        </div>
        <div className="gantt-header-days">
          {weekDays.map(day => (
            <div key={format(day, 'yyyy-MM-dd')} className="gantt-header-day">
              <div className="gantt-day-name">{format(day, 'EEE')}</div>
              <div className="gantt-day-number">{format(day, 'd')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Gantt chart body */}
      <div className="gantt-body">
        {ganttTasks.map(task => {
          const { left, width, visible } = getTaskPosition(task)
          if (!visible) return null
          
          return (
            <div key={task.id} className="gantt-row">
              <div className="gantt-task-name" onClick={() => onTaskClick(task)}>
                {task.title}
              </div>
              <div className="gantt-task-bar-container">
                <div
                  className={`gantt-task-bar ${draggedTask?.id === task.id ? 'dragging' : ''}`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    cursor: 'move'
                  }}
                  onMouseDown={(e) => handleTaskDragStart(e, task)}
                >
                  {task.title}
                </div>
              </div>
            </div>
          )
        })}

        {ganttTasks.length === 0 && (
          <div className="gantt-empty">
            <p>{t('tasks.noGanttTasks') || 'No tasks with start/due dates. Add dates to tasks to see them in Gantt view.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

