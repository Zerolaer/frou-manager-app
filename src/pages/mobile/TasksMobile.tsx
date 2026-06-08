import React, { useCallback, useEffect, useRef, useState } from 'react'

import { format } from 'date-fns'

import { enUS, ru } from 'date-fns/locale'

import { CheckCircle2, Circle, ListTodo, Loader2, Plus } from 'lucide-react'

import { useSafeTranslation } from '@/utils/safeTranslation'

import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

import { useMobileTasks } from '@/hooks/useMobileTasks'

import { usePullToRefresh } from '@/hooks/usePullToRefresh'

import MobileLayout from '@/components/mobile/MobileLayout'

import MobileWeekStrip from '@/components/mobile/MobileWeekStrip'

import MobileTaskAddModal from '@/components/mobile/MobileTaskAddModal'

import MobileTaskModal from '@/components/mobile/MobileTaskModal'

import { Badge } from '@/components/ui/badge'

import { TaskCardSkeleton } from '@/components/ui/Skeleton'

import { TASK_PROJECT_ALL, TASK_STATUSES } from '@/lib/constants'

import { updateRecurringTaskSettings } from '@/lib/updateRecurringTaskSettings'

import { getPriorityColor, getPriorityTextKey } from '@/lib/taskHelpers'

import { hapticLightTap, hapticSelection, hapticTaskComplete } from '@/platform/haptics'

import { cn } from '@/lib/utils'

import i18n from '@/lib/i18n'

import type { RecurringTaskSettings } from '@/types/recurring'

import type { TaskItem, Todo } from '@/types/shared'



export default function TasksMobile() {

  const { t } = useSafeTranslation()

  const { userId } = useSupabaseAuth()

  const locale = i18n.language?.startsWith('ru') ? ru : enUS



  const [currentDate, setCurrentDate] = useState(() => new Date())

  const [activeProject, setActiveProject] = useState(TASK_PROJECT_ALL)

  const [showAddModal, setShowAddModal] = useState(false)

  const [viewTask, setViewTask] = useState<TaskItem | null>(null)



  const {

    projects,

    tasks,

    weekCounts,

    loading,

    refreshing,

    refresh,

    toggleTask,

    createTask,

    patchTask,

  } = useMobileTasks(currentDate, activeProject)



  const { pullDistance, refreshing: pullRefreshing } = usePullToRefresh({

    onRefresh: () => refresh(true),

    enabled: !loading,

  })



  const isPullActive = pullRefreshing || refreshing

  const shiftWeek = (delta: number) => {

    const next = new Date(currentDate)

    next.setDate(next.getDate() + delta * 7)

    setCurrentDate(next)

  }



  const handleCreate = async (

    title: string,

    desc: string,

    prio: string,

    tag: string,

    todos: Todo[],

    projId?: string,

    date?: Date

  ) => {

    if (!userId) return

    const ok = await createTask(userId, title, desc, prio, tag, todos, projId ?? '', date ?? currentDate)

    if (ok) setShowAddModal(false)

  }



  const handleToggle = useCallback(

    async (task: TaskItem) => {

      const willComplete = task.status !== TASK_STATUSES.CLOSED

      hapticLightTap()

      await toggleTask(task)

      if (willComplete) {

        hapticTaskComplete()

      } else {

        hapticSelection()

      }

    },

    [toggleTask]

  )



  const handleUpdateRecurrence = useCallback(

    async (taskId: string, settings: RecurringTaskSettings) => {

      if (!userId) return

      const task = tasks.find((t) => t.id === taskId) ?? viewTask

      if (!task) return



      const { recurringTaskId } = await updateRecurringTaskSettings(userId, task, settings)

      await refresh(true)



      if (viewTask?.id === taskId) {

        setViewTask((prev) =>

          prev ? { ...prev, recurring_task_id: recurringTaskId ?? prev.recurring_task_id } : null

        )

      }

    },

    [userId, tasks, viewTask, refresh]

  )



  const handleProjectSelect = (projectId: string) => {

    if (projectId === activeProject) return

    hapticLightTap()

    setActiveProject(projectId)

  }



  return (

    <MobileLayout>

      <PullRefreshIndicator distance={pullDistance} refreshing={isPullActive} />



      <div

        className="flex flex-col gap-4 p-4 pb-2 transition-transform duration-150"

        style={{ transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined }}

      >

        <MobileWeekStrip

          selected={currentDate}

          onSelect={setCurrentDate}

          onPrevWeek={() => shiftWeek(-1)}

          onNextWeek={() => shiftWeek(1)}

          taskCounts={weekCounts}

        />



        {projects.length > 0 && (

          <ProjectChipRow

            projects={projects}

            activeProject={activeProject}

            onSelect={handleProjectSelect}

            allLabel={t('tasks.allProjects')}

          />

        )}



        <section className="space-y-2 min-h-[12rem]">

          {loading ? (

            <TaskListSkeleton />

          ) : tasks.length === 0 ? (

            <EmptyDay

              filtered={activeProject !== TASK_PROJECT_ALL}

              onAdd={() => setShowAddModal(true)}

            />

          ) : (

            tasks.map((task) => (

              <MobileTaskCard

                key={task.id}

                task={task}

                onToggle={() => void handleToggle(task)}

                onOpen={() => setViewTask(task)}

              />

            ))

          )}

        </section>

      </div>



      <button

        type="button"

        className="mobile-fab"

        onClick={() => {

          hapticLightTap()

          setShowAddModal(true)

        }}

        aria-label={t('actions.newTask')}

      >

        <Plus className="w-6 h-6" strokeWidth={2.25} />

      </button>



      <MobileTaskAddModal

        open={showAddModal}

        onClose={() => setShowAddModal(false)}

        projects={projects}

        activeProject={activeProject === TASK_PROJECT_ALL ? null : activeProject}

        dateLabel={format(currentDate, 'd MMMM yyyy', { locale })}

        initialDate={currentDate}

        onSubmit={handleCreate}

      />



      <MobileTaskModal

        open={!!viewTask}

        onClose={() => setViewTask(null)}

        task={viewTask}

        onUpdated={(updated, isSave) => {

          if (!updated) {

            setViewTask(null)

            void refresh(true)

            return

          }

          patchTask(updated as TaskItem)

          if (isSave) setViewTask(null)

        }}

        onUpdateRecurrence={handleUpdateRecurrence}

      />

    </MobileLayout>

  )

}



function PullRefreshIndicator({

  distance,

  refreshing,

}: {

  distance: number

  refreshing: boolean

}) {

  const { t } = useSafeTranslation()

  const visible = refreshing || distance > 8



  return (

    <div

      className={cn(

        'pointer-events-none flex items-center justify-center gap-2 overflow-hidden text-xs font-medium text-gray-500 transition-all duration-200',

        visible ? 'opacity-100' : 'opacity-0 h-0'

      )}

      style={{ height: visible ? Math.max(distance, refreshing ? 36 : 0) : 0 }}

      aria-live="polite"

    >

      <Loader2

        className={cn('h-4 w-4', refreshing ? 'animate-spin text-primary' : 'text-gray-400')}

      />

      {refreshing && <span>{t('common.refresh')}</span>}

    </div>

  )

}



function ProjectChipRow({

  projects,

  activeProject,

  onSelect,

  allLabel,

}: {

  projects: { id: string; name: string }[]

  activeProject: string

  onSelect: (id: string) => void

  allLabel: string

}) {

  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({})



  useEffect(() => {

    const key = activeProject === TASK_PROJECT_ALL ? '__all__' : activeProject

    const chip = chipRefs.current[key]

    chip?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })

  }, [activeProject])



  return (

    <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none snap-x snap-mandatory scroll-smooth">

      <ProjectChip

        ref={(el) => {

          chipRefs.current.__all__ = el

        }}

        active={activeProject === TASK_PROJECT_ALL}

        onClick={() => onSelect(TASK_PROJECT_ALL)}

        label={allLabel}

      />

      {projects.map((p) => (

        <ProjectChip

          key={p.id}

          ref={(el) => {

            chipRefs.current[p.id] = el

          }}

          active={activeProject === p.id}

          onClick={() => onSelect(p.id)}

          label={p.name}

        />

      ))}

    </div>

  )

}



const ProjectChip = React.forwardRef<

  HTMLButtonElement,

  { label: string; active: boolean; onClick: () => void }

>(function ProjectChip({ label, active, onClick }, ref) {

  return (

    <button

      ref={ref}

      type="button"

      onClick={onClick}

      className={cn(

        'shrink-0 snap-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all touch-manipulation',

        active

          ? 'border-primary bg-primary text-primary-foreground shadow-sm'

          : 'border-outline bg-background-card text-gray-600 active:bg-secondary'

      )}

    >

      {label}

    </button>

  )

})



function TaskListSkeleton() {

  return (

    <div className="space-y-2" aria-busy="true" aria-label="Loading tasks">

      {Array.from({ length: 4 }).map((_, i) => (

        <div key={i} className="rounded-xl border border-outline overflow-hidden">

          <TaskCardSkeleton />

        </div>

      ))}

    </div>

  )

}



function EmptyDay({

  filtered,

  onAdd,

}: {

  filtered: boolean

  onAdd: () => void

}) {

  const { t } = useSafeTranslation()

  return (

    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline bg-background-card px-6 py-12 text-center">

      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">

        <ListTodo className="w-7 h-7 text-gray-500" />

      </div>

      <p className="text-base font-semibold text-gray-800">

        {filtered ? t('tasks.noTasks') : t('tasks.noTasksThisDay')}

      </p>

      <p className="mt-1.5 max-w-[16rem] text-sm text-gray-500 leading-relaxed">

        {t('tasks.taskDetails')}

      </p>

      <button

        type="button"

        onClick={onAdd}

        className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm active:scale-[0.98] transition-transform"

      >

        <Plus className="w-4 h-4" />

        {t('actions.newTask')}

      </button>

    </div>

  )

}



function MobileTaskCard({

  task,

  onToggle,

  onOpen,

}: {

  task: TaskItem

  onToggle: () => void

  onOpen: () => void

}) {

  const { t } = useSafeTranslation()

  const priorityKey = getPriorityTextKey(task.priority)

  const prioColors = getPriorityColor(task.priority)

  const todoDone = (task.todos || []).filter((x) => x.done).length

  const todoTotal = (task.todos || []).length

  const isDone = task.status === TASK_STATUSES.CLOSED



  return (

    <div

      className={cn(

        'flex gap-3 rounded-xl border border-outline bg-background-card p-3.5 shadow-sm',

        'active:scale-[0.99] transition-transform'

      )}

    >

      <button

        type="button"

        className="mt-0.5 shrink-0 touch-manipulation"

        onClick={onToggle}

        aria-label={isDone ? t('tasks.open') : t('tasks.markAsDone')}

      >

        {isDone ? (

          <CheckCircle2 className="w-5 h-5 text-primary" />

        ) : (

          <Circle className="w-5 h-5 text-gray-300" />

        )}

      </button>



      <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>

        <p

          className={cn(

            'text-sm font-semibold leading-snug',

            isDone ? 'text-gray-400 line-through' : 'text-primary'

          )}

        >

          {task.title}

        </p>

        {task.description ? (

          <p className="mt-1 text-xs text-gray-500 line-clamp-2 leading-relaxed">{task.description}</p>

        ) : null}



        {(priorityKey || task.project_name || task.tag || todoTotal > 0 || task.recurring_task_id) && (

          <div className="mt-2 flex flex-wrap gap-1.5">

            {priorityKey && (

              <span

                className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold"

                style={{ background: prioColors.background, color: prioColors.text }}

              >

                {t(priorityKey)}

              </span>

            )}

            {task.project_name && (

              <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0 h-5">

                {task.project_name}

              </Badge>

            )}

            {task.tag && (

              <Badge variant="outline" className="text-[10px] font-medium px-2 py-0 h-5">

                {task.tag}

              </Badge>

            )}

            {todoTotal > 0 && (

              <Badge variant="outline" className="text-[10px] font-medium px-2 py-0 h-5 tabular-nums">

                {todoDone}/{todoTotal}

              </Badge>

            )}

          </div>

        )}

      </button>

    </div>

  )

}


