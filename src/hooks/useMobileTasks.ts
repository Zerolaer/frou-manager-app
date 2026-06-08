import { useCallback, useEffect, useRef, useState } from 'react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { supabase } from '@/lib/supabaseClient'
import { TASK_PROJECT_ALL, TASK_STATUSES } from '@/lib/constants'
import { filterVisibleTaskProjects } from '@/lib/taskProjects'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { useSafeTranslation } from '@/utils/safeTranslation'
import type { Project, TaskItem, Todo } from '@/types/shared'

const TASK_SELECT =
  'id,project_id,title,description,status,priority,tag,todos,date,position,recurring_task_id,tasks_projects(name)'

function mapRow(t: Record<string, unknown>): TaskItem {
  const rel = t.tasks_projects as { name?: string } | null
  return {
    id: t.id as string,
    project_id: t.project_id as string | null,
    title: t.title as string,
    description: t.description as string | null,
    date: t.date as string,
    position: t.position as number,
    priority: t.priority as string | null,
    tag: t.tag as string | null,
    todos: (t.todos as Todo[]) || [],
    status: (t.status as string) || TASK_STATUSES.OPEN,
    project_name: rel?.name ?? null,
    recurring_task_id: (t.recurring_task_id as string | null) ?? null,
  }
}

export function useMobileTasks(date: Date, activeProject: string) {
  const { t } = useSafeTranslation()
  const { userId, loading: authLoading } = useSupabaseAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [weekCounts, setWeekCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const fetchGenRef = useRef(0)

  const dateKey = format(date, 'yyyy-MM-dd')
  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
  const weekStartKey = format(weekStart, 'yyyy-MM-dd')
  const weekEndKey = format(weekEnd, 'yyyy-MM-dd')

  const loadProjects = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('tasks_projects')
      .select('id,name,color')
      .order('created_at', { ascending: true })
    if (!error && data) {
      setProjects(
        filterVisibleTaskProjects(data as Project[], t('projects.uncategorized'))
      )
    }
  }, [t, userId])

  const loadTasks = useCallback(async (options?: { silent?: boolean }) => {
    if (!userId) return

    const fetchGen = ++fetchGenRef.current
    const silent = options?.silent ?? false
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      let query = supabase
        .from('tasks_items')
        .select(TASK_SELECT)
        .eq('date', dateKey)
        .order('position', { ascending: true })

      if (activeProject !== TASK_PROJECT_ALL) {
        query = query.eq('project_id', activeProject)
      }

      let weekQuery = supabase
        .from('tasks_items')
        .select('date')
        .gte('date', weekStartKey)
        .lte('date', weekEndKey)

      if (activeProject !== TASK_PROJECT_ALL) {
        weekQuery = weekQuery.eq('project_id', activeProject)
      }

      const [dayRes, weekRes] = await Promise.all([query, weekQuery])

      if (fetchGen !== fetchGenRef.current) return

      if (dayRes.error) {
        setTasks([])
      } else {
        setTasks((dayRes.data ?? []).map((row) => mapRow(row as Record<string, unknown>)))
      }

      if (weekRes.error) {
        setWeekCounts({})
      } else {
        const counts: Record<string, number> = {}
        ;(weekRes.data ?? []).forEach((row) => {
          const key = row.date as string
          counts[key] = (counts[key] || 0) + 1
        })
        setWeekCounts(counts)
      }
    } finally {
      if (fetchGen !== fetchGenRef.current) return
      if (silent) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }, [dateKey, weekStartKey, weekEndKey, activeProject, userId])

  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      setProjects([])
      setTasks([])
      setWeekCounts({})
      setLoading(false)
      return
    }
    void loadProjects()
  }, [authLoading, userId, loadProjects])

  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      setTasks([])
      setWeekCounts({})
      setLoading(false)
      return
    }
    void loadTasks()
  }, [authLoading, userId, loadTasks])

  const toggleTask = useCallback(
    async (task: TaskItem) => {
      const newStatus =
        task.status === TASK_STATUSES.CLOSED ? TASK_STATUSES.OPEN : TASK_STATUSES.CLOSED
      const { error } = await supabase
        .from('tasks_items')
        .update({ status: newStatus })
        .eq('id', task.id)
      if (error) {
        await loadTasks()
        return
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      )
    },
    [loadTasks]
  )

  const createTask = useCallback(
    async (
      userId: string,
      title: string,
      desc: string,
      prio: string,
      tag: string,
      todos: Todo[],
      projId: string,
      taskDate: Date
    ) => {
      const taskDateKey = format(taskDate, 'yyyy-MM-dd')
      const { data, error } = await supabase
        .from('tasks_items')
        .insert({
          user_id: userId,
          project_id: projId || null,
          title,
          description: desc,
          date: taskDateKey,
          position: tasks.length,
          priority: prio,
          tag,
          todos: todos || [],
        })
        .select(TASK_SELECT)
        .single()

      if (error || !data) return false
      const mapped = mapRow(data as Record<string, unknown>)
      if (taskDateKey === dateKey) {
        setTasks((prev) => [...prev, mapped])
      }
      if (taskDateKey >= weekStartKey && taskDateKey <= weekEndKey) {
        setWeekCounts((prev) => ({
          ...prev,
          [taskDateKey]: (prev[taskDateKey] || 0) + 1,
        }))
      }
      return true
    },
    [tasks.length, dateKey, weekStartKey, weekEndKey]
  )

  const patchTask = useCallback((updated: TaskItem | null) => {
    if (!updated) return
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)))
  }, [])

  const refresh = useCallback(
    (silent = true) => loadTasks({ silent }),
    [loadTasks]
  )

  return {
    projects,
    tasks,
    weekCounts,
    loading,
    refreshing,
    refresh,
    toggleTask,
    createTask,
    patchTask,
  }
}
