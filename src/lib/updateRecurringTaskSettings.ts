import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/lib/monitoring'
import type { TaskItem } from '@/types/shared'
import type { RecurringTaskSettings } from '@/types/recurring'

/**
 * Updates recurring task settings for a task instance.
 * Shared between desktop Tasks and mobile Tasks flows.
 */
export async function updateRecurringTaskSettings(
  userId: string,
  task: TaskItem,
  settings: RecurringTaskSettings
): Promise<{ recurringTaskId: string | null }> {
  if (!userId) return { recurringTaskId: task.recurring_task_id ?? null }

  if (task.recurring_task_id) {
    const { data: oldRecurringTask, error: fetchError } = await supabase
      .from('recurring_tasks')
      .select('*')
      .eq('id', task.recurring_task_id)
      .single()

    if (fetchError) {
      logger.error('Error fetching old recurring task:', fetchError)
      throw fetchError
    }

    const oldEndDate = oldRecurringTask?.end_date ? new Date(oldRecurringTask.end_date) : null
    const newEndDate = settings.endDate
      ? typeof settings.endDate === 'string'
        ? new Date(settings.endDate)
        : settings.endDate
      : null
    const newEndDateStr = settings.endDate
      ? typeof settings.endDate === 'string'
        ? settings.endDate
        : settings.endDate.toISOString().split('T')[0]
      : null

    const updateData: Record<string, unknown> = {
      recurrence_type: settings.recurrenceType,
      recurrence_interval: settings.interval || settings.recurrenceInterval || 1,
      recurrence_day_of_week: settings.dayOfWeek || settings.recurrenceDayOfWeek,
      recurrence_day_of_month: settings.dayOfMonth || settings.recurrenceDayOfMonth,
    }

    if (settings.endDate !== undefined) {
      updateData.end_date = newEndDateStr
    }

    const { error } = await supabase
      .from('recurring_tasks')
      .update(updateData)
      .eq('id', task.recurring_task_id)

    if (error) {
      logger.error('Error updating recurring task settings:', error)
      throw error
    }

    const { generateRecurringTaskInstances } = await import('@/utils/recurringUtils')

    if (oldEndDate && newEndDate && newEndDate > oldEndDate) {
      const startDate = new Date(oldEndDate)
      startDate.setDate(startDate.getDate() + 1)

      const instances = generateRecurringTaskInstances(startDate, {
        ...settings,
        endDate: newEndDate,
      })

      const tasksToCreate = instances
        .filter((inst) => {
          const instDate = new Date(inst.date)
          return instDate > oldEndDate && instDate <= newEndDate
        })
        .map((inst) => ({
          user_id: userId,
          project_id: task.project_id,
          title: task.title,
          description: task.description || '',
          priority: task.priority || 'normal',
          tag: task.tag || '',
          scheduled_time: task.scheduled_time || null,
          date: inst.date,
          position: 0,
          todos: task.todos || [],
          status: 'open',
          recurring_task_id: task.recurring_task_id,
        }))

      if (tasksToCreate.length > 0) {
        const existingDates = tasksToCreate.map((t) => t.date)
        const { data: existingTasks } = await supabase
          .from('tasks_items')
          .select('date, recurring_task_id')
          .eq('recurring_task_id', task.recurring_task_id)
          .in('date', existingDates)

        const existingKeys = new Set(
          existingTasks?.map((t) => `${t.date}_${t.recurring_task_id}`) || []
        )

        const tasksToInsert = tasksToCreate.filter((t) => {
          const key = `${t.date}_${t.recurring_task_id}`
          return !existingKeys.has(key)
        })

        if (tasksToInsert.length > 0) {
          const { error: insertError } = await supabase.from('tasks_items').insert(tasksToInsert)
          if (insertError) throw insertError
        }
      }
    } else if (oldEndDate && newEndDate && newEndDate < oldEndDate) {
      const { error: deleteError } = await supabase
        .from('tasks_items')
        .delete()
        .eq('recurring_task_id', task.recurring_task_id)
        .gt('date', newEndDateStr)

      if (deleteError) throw deleteError
    } else if (!oldEndDate && newEndDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const instances = generateRecurringTaskInstances(today, {
        ...settings,
        endDate: newEndDate,
      })

      const tasksToCreate = instances
        .filter((inst) => {
          const instDate = new Date(inst.date)
          return instDate <= newEndDate
        })
        .map((inst) => ({
          user_id: userId,
          project_id: task.project_id,
          title: task.title,
          description: task.description || '',
          priority: task.priority || 'normal',
          tag: task.tag || '',
          scheduled_time: task.scheduled_time || null,
          date: inst.date,
          position: 0,
          todos: task.todos || [],
          status: 'open',
          recurring_task_id: task.recurring_task_id,
        }))

      if (tasksToCreate.length > 0) {
        const existingDates = tasksToCreate.map((t) => t.date)
        const { data: existingTasks } = await supabase
          .from('tasks_items')
          .select('date, recurring_task_id')
          .eq('recurring_task_id', task.recurring_task_id)
          .in('date', existingDates)

        const existingKeys = new Set(
          existingTasks?.map((t) => `${t.date}_${t.recurring_task_id}`) || []
        )

        const tasksToInsert = tasksToCreate.filter((t) => {
          const key = `${t.date}_${t.recurring_task_id}`
          return !existingKeys.has(key)
        })

        if (tasksToInsert.length > 0) {
          const { error: insertError } = await supabase.from('tasks_items').insert(tasksToInsert)
          if (insertError) throw insertError
        }
      }
    }
    return { recurringTaskId: task.recurring_task_id }
  }

  const { generateRecurringTaskInstances } = await import('@/utils/recurringUtils')
  const taskDate = task.date ? new Date(task.date) : new Date()
  const instances = generateRecurringTaskInstances(taskDate, settings)

  const { data: recurringTaskData, error: recurringError } = await supabase
    .from('recurring_tasks')
    .insert({
      user_id: userId,
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'normal',
      tag: task.tag || '',
      scheduled_time: task.scheduled_time || null,
      todos: task.todos || [],
      project_id: task.project_id,
      recurrence_type: settings.recurrenceType,
      recurrence_interval: settings.interval || settings.recurrenceInterval || 1,
      recurrence_day_of_week: settings.dayOfWeek || settings.recurrenceDayOfWeek,
      recurrence_day_of_month: settings.dayOfMonth || settings.recurrenceDayOfMonth,
      start_date: taskDate.toISOString().split('T')[0],
      end_date:
        typeof settings.endDate === 'string'
          ? settings.endDate
          : settings.endDate?.toISOString().split('T')[0],
      is_active: true,
    })
    .select()
    .single()

  if (recurringError) {
    logger.error('Error creating recurring task:', recurringError)
    throw recurringError
  }

  const recurringTaskId = recurringTaskData.id

  await supabase
    .from('tasks_items')
    .update({ recurring_task_id: recurringTaskId })
    .eq('id', task.id)

  const tasksToCreate = instances
    .filter((inst) => inst.date !== task.date)
    .map((inst) => ({
      user_id: userId,
      project_id: task.project_id,
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'normal',
      tag: task.tag || '',
      scheduled_time: task.scheduled_time || null,
      date: inst.date,
      position: 0,
      todos: task.todos || [],
      status: 'open',
      recurring_task_id: recurringTaskId,
    }))

  if (tasksToCreate.length > 0) {
    const { error: insertError } = await supabase.from('tasks_items').insert(tasksToCreate)
    if (insertError) throw insertError
  }

  return { recurringTaskId }
}
