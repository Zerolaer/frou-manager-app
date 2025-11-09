import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Circle, CheckCircle2 } from 'lucide-react'
import { format, addDays, subDays, isToday } from 'date-fns'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabaseClient'
import MobileLayout from '@/components/mobile/MobileLayout'
import MobileTaskAddModal from '@/components/mobile/MobileTaskAddModal'
import MobileTaskModal from '@/components/mobile/MobileTaskModal'
import { TASK_STATUSES } from '@/lib/constants'
import type { TaskItem } from '@/types/shared'

type Task = {
  id: string
  title: string
  description?: string | null
  priority?: string | null
  tag?: string | null
  date?: string | null
  todos?: any[]
  status?: string
  created_at?: string
  updated_at?: string
}

export default function TasksMobile() {
  const { t } = useSafeTranslation()
  const { userId } = useSupabaseAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewTask, setViewTask] = useState<TaskItem | null>(null)

  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isTodayDate = isToday(currentDate)

  // Load tasks
  React.useEffect(() => {
    if (!userId) return

    const loadTasks = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('tasks_items')
          .select('id,title,description,status,priority,tag,todos,date,position,tasks_projects(name)')
          .eq('date', dateKey)
          .order('position')

        if (!error && data) {
          setTasks(data.map(t => ({
            ...t,
            project_name: (t as any).tasks_projects?.name
          })))
        }
      } finally {
        setLoading(false)
      }
    }

    loadTasks()
  }, [userId, dateKey])

  const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1))
  const handleNextDay = () => setCurrentDate(addDays(currentDate, 1))
  const handleToday = () => setCurrentDate(new Date())

  const toggleTask = async (task: TaskItem) => {
    const newStatus = task.status === TASK_STATUSES.CLOSED ? TASK_STATUSES.OPEN : TASK_STATUSES.CLOSED
    await supabase.from('tasks_items').update({ status: newStatus }).eq('id', task.id)
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }
  
  const createTask = async (title: string, desc: string, prio: string, tag: string, todos: any[], projId: string, date?: Date) => {
    if (!userId) return
    
    // Use provided date or current date
    const taskDate = date ? format(date, 'yyyy-MM-dd') : dateKey
    
    const { data, error } = await supabase
      .from('tasks_items')
      .insert({
        user_id: userId,
        project_id: projId || null,
        title,
        description: desc,
        date: taskDate,
        position: tasks.length,
        priority: prio,
        tag,
        todos: todos || []
      })
      .select('id,project_id,title,description,date,position,priority,tag,todos,status,tasks_projects(name)')
      .single()
    
    if (!error && data) {
      const newTask: TaskItem = {
        id: data.id,
        project_id: data.project_id,
        title: data.title,
        description: data.description,
        date: data.date,
        position: data.position,
        priority: data.priority,
        tag: data.tag,
        todos: data.todos || [],
        status: data.status || TASK_STATUSES.OPEN,
        project_name: (data as any).tasks_projects?.name || null
      }
      setTasks([...tasks, newTask])
      console.log(`Task created: ${title}`)
      setShowAddModal(false)
    }
  }
  
  const handleTaskUpdate = async (updatedTask: Task | null, isSave?: boolean) => {
    if (!updatedTask) {
      setViewTask(null)
      return
    }
    
    // Update local state immediately - map Task to TaskItem
    setTasks(tasks.map(t => 
      t.id === updatedTask.id 
        ? { ...t, ...updatedTask }
        : t
    ))
    
    // Only close modal on explicit save, not on auto-save
    if (isSave) {
      setViewTask(null)
    }
  }

  const activeTasks = tasks.filter(t => t.status !== TASK_STATUSES.CLOSED)
  const completedTasks = tasks.filter(t => t.status === TASK_STATUSES.CLOSED)

  return (
    <MobileLayout 
      title={t('nav.tasks')}
      action={
        <button 
          onClick={() => setShowAddModal(true)}
          className="p-2 -mr-2 rounded-lg hover:bg-gray-100"
        >
          <Plus className="w-5 h-5 text-gray-900" />
        </button>
      }
    >
      {/* Date Navigator */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={handlePrevDay} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <div className="text-base font-semibold text-gray-900">
              {format(currentDate, 'd MMMM, EEEE')}
            </div>
            {!isTodayDate && (
              <button
                onClick={handleToday}
                className="text-xs text-gray-900 font-medium mt-0.5 px-2 py-0.5 bg-gray-100 rounded"
              >
                {t('common.today')}
              </button>
            )}
          </div>
          <button onClick={handleNextDay} className="p-2 -mr-2 rounded-lg hover:bg-gray-100">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-xs text-gray-600 font-medium mb-1">{t('dashboard.totalTasks')}</div>
          <div className="text-xl font-bold text-gray-900">{tasks.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-xs text-gray-600 font-medium mb-1">{t('dashboard.completed')}</div>
          <div className="text-xl font-bold text-gray-900">{completedTasks.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-xs text-gray-600 font-medium mb-1">{t('tasks.active')}</div>
          <div className="text-xl font-bold text-gray-900">{activeTasks.length}</div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="px-4 pb-6 space-y-4">
        {/* Active Tasks */}
        {activeTasks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('tasks.active')}</h3>
            <div className="space-y-2">
              {activeTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 active:bg-gray-50"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTask(task)
                    }}
                    className="mt-0.5 flex-shrink-0"
                  >
                    <Circle className="w-5 h-5 text-gray-400 hover:text-gray-900" />
                  </button>
                  <div 
                    className="flex-1 min-w-0"
                    onClick={() => setViewTask(task)}
                  >
                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                    {task.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</div>
                    )}
                    {task.project_name && (
                      <div className="text-xs text-gray-400 mt-1">{task.project_name}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('dashboard.completed')}</h3>
            <div className="space-y-2">
              {completedTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 opacity-40 active:bg-gray-50"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTask(task)
                    }}
                    className="mt-0.5 flex-shrink-0"
                  >
                    <CheckCircle2 className="w-5 h-5 text-gray-900 hover:text-gray-600" />
                  </button>
                  <div 
                    className="flex-1 min-w-0"
                    onClick={() => setViewTask(task)}
                  >
                    <div className="text-sm font-medium text-gray-900 line-through">{task.title}</div>
                    {task.project_name && (
                      <div className="text-xs text-gray-400 mt-1">{task.project_name}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-sm">{t('dashboard.noTasks')}</div>
          </div>
        )}
      </div>
      
      {/* Modals */}
      <MobileTaskAddModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        projects={[]}
        activeProject={null}
        dateLabel={format(currentDate, 'd MMMM, EEEE')}
        initialDate={currentDate}
        onSubmit={async (title, desc, prio, tag, todos, projId, date) => {
          await createTask(title, desc, prio, tag, todos, projId || '', date)
        }}
      />
      
      <MobileTaskModal
        open={!!viewTask}
        onClose={() => setViewTask(null)}
        task={viewTask}
        onUpdated={handleTaskUpdate}
        onUpdateRecurrence={async () => {}}
      />
    </MobileLayout>
  )
}

