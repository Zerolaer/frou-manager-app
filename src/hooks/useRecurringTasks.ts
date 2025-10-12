import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { RecurringTask, RecurringTaskSettings } from '@/types/recurring'
import { generateTaskInstances, calculateNextOccurrence } from '@/utils/recurringUtils'
import { logger } from '@/lib/monitoring'

export function useRecurringTasks(userId: string) {
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([])
  const [loading, setLoading] = useState(false)

  // Load recurring tasks
  const loadRecurringTasks = async () => {
    if (!userId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('recurring_tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Error loading recurring tasks:', error)
        return
      }

      setRecurringTasks(data || [])
    } catch (error) {
      logger.error('Error loading recurring tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  // Create a new recurring task
  const createRecurringTask = async (taskData: {
    title: string
    description?: string
    priority?: string
    tag?: string
    todos?: Array<{ id: string; text: string; done: boolean }>
    project_id?: string | null
    settings: RecurringTaskSettings
    startDate: string
  }) => {
    if (!userId || !taskData.settings.isRecurring) return null

    const { settings } = taskData
    const startDate = new Date(taskData.startDate)
    
    // Calculate next occurrence
    const nextOccurrence = calculateNextOccurrence(
      startDate,
      settings.recurrenceType!,
      settings.recurrenceInterval || 1,
      settings.recurrenceDayOfWeek,
      settings.recurrenceDayOfMonth,
      settings.recurrenceMonthOfYear
    )

    const recurringTaskData = {
      user_id: userId,
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'normal',
      tag: taskData.tag || '',
      todos: taskData.todos || [],
      project_id: taskData.project_id,
      recurrence_type: settings.recurrenceType,
      recurrence_interval: settings.recurrenceInterval || 1,
      recurrence_day_of_week: settings.recurrenceDayOfWeek,
      recurrence_day_of_month: settings.recurrenceDayOfMonth,
      recurrence_month_of_year: settings.recurrenceMonthOfYear,
      start_date: taskData.startDate,
      end_date: settings.endDate,
      next_occurrence: nextOccurrence.toISOString().split('T')[0],
      is_active: true
    }

    try {
      const { data, error } = await supabase
        .from('recurring_tasks')
        .insert(recurringTaskData)
        .select()
        .single()

      if (error) {
        logger.error('Error creating recurring task:', error)
        throw error
      }

      logger.debug('Created recurring task:', data)
      return data
    } catch (error) {
      logger.error('Error creating recurring task:', error)
      throw error
    }
  }

  // Generate task instances for a date range
  const generateTasksForDateRange = async (startDate: Date, endDate: Date) => {
    const generatedTasks: Array<{
      recurring_task_id: string
      title: string
      description?: string
      priority?: string
      tag?: string
      todos?: Array<{ id: string; text: string; done: boolean }>
      project_id?: string | null
      date: string
      position: number
    }> = []

    for (const recurringTask of recurringTasks) {
      if (!recurringTask.is_active) continue

      // Check if we need to generate instances for this task
      const taskStartDate = new Date(recurringTask.start_date)
      const taskEndDate = recurringTask.end_date ? new Date(recurringTask.end_date) : null
      
      if (taskEndDate && taskEndDate < startDate) continue
      if (taskStartDate > endDate) continue

      // Generate instances
      const instances = generateTaskInstances(recurringTask, startDate, endDate)
      
      for (const instance of instances) {
        // Check if task instance already exists
        const { data: existingTask } = await supabase
          .from('tasks_items')
          .select('id')
          .eq('recurring_task_id', recurringTask.id)
          .eq('date', instance.date)
          .single()

        if (!existingTask) {
          // Get the highest position for this date
          const { data: lastTask } = await supabase
            .from('tasks_items')
            .select('position')
            .eq('date', instance.date)
            .order('position', { ascending: false })
            .limit(1)
            .single()

          const nextPosition = (lastTask?.position || 0) + 1

          generatedTasks.push({
            recurring_task_id: recurringTask.id,
            title: recurringTask.title,
            description: recurringTask.description,
            priority: recurringTask.priority,
            tag: recurringTask.tag,
            todos: recurringTask.todos || [],
            project_id: recurringTask.project_id,
            date: instance.date,
            position: nextPosition
          })
        }
      }
    }

    // Insert generated tasks
    if (generatedTasks.length > 0) {
      try {
        const { error } = await supabase
          .from('tasks_items')
          .insert(generatedTasks.map(task => ({
            ...task,
            user_id: userId,
            status: 'open'
          })))

        if (error) {
          logger.error('Error inserting generated tasks:', error)
          throw error
        }

        logger.debug(`Generated ${generatedTasks.length} task instances`)
      } catch (error) {
        logger.error('Error inserting generated tasks:', error)
        throw error
      }
    }

    return generatedTasks.length
  }

  // Update recurring task
  const updateRecurringTask = async (taskId: string, updates: Partial<RecurringTask>) => {
    try {
      const { data, error } = await supabase
        .from('recurring_tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single()

      if (error) {
        logger.error('Error updating recurring task:', error)
        throw error
      }

      // Update local state
      setRecurringTasks(prev => 
        prev.map(task => task.id === taskId ? { ...task, ...data } : task)
      )

      return data
    } catch (error) {
      logger.error('Error updating recurring task:', error)
      throw error
    }
  }

  // Delete recurring task
  const deleteRecurringTask = async (taskId: string) => {
    try {
      // First, delete all associated task instances
      const { error: instancesError } = await supabase
        .from('tasks_items')
        .delete()
        .eq('recurring_task_id', taskId)

      if (instancesError) {
        logger.error('Error deleting task instances:', instancesError)
        throw instancesError
      }

      // Then delete the recurring task
      const { error: recurringError } = await supabase
        .from('recurring_tasks')
        .delete()
        .eq('id', taskId)

      if (recurringError) {
        logger.error('Error deleting recurring task:', recurringError)
        throw recurringError
      }

      // Update local state
      setRecurringTasks(prev => prev.filter(task => task.id !== taskId))

      logger.debug('Deleted recurring task and all instances')
    } catch (error) {
      logger.error('Error deleting recurring task:', error)
      throw error
    }
  }

  // Load recurring tasks on mount
  useEffect(() => {
    loadRecurringTasks()
  }, [userId])

  return {
    recurringTasks,
    loading,
    createRecurringTask,
    generateTasksForDateRange,
    updateRecurringTask,
    deleteRecurringTask,
    refreshRecurringTasks: loadRecurringTasks
  }
}
