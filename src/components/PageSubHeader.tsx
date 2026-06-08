import { useLocation } from 'react-router-dom'
import { Plus, Calendar, Target } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import YearSelector from './YearSelector'
import WeekSelector from './WeekSelector'
import ProjectFilterDropdown from './ProjectFilterDropdown'
import { TASK_PROJECT_ALL } from '@/lib/constants'
import { dispatchTasksSubheaderAction } from '@/lib/tasksSubheaderBridge'
import { dispatchFinanceSubheaderAction } from '@/lib/financeSubheaderBridge'
import type { Project } from '@/types/shared'

export interface PageSubHeaderProps {
  onAction?: (action: string) => void
  currentYear?: number
  onYearChange?: (year: number) => void
  selectedWeek?: Date
  onWeekChange?: (week: Date) => void
  tasksProjectsData?: {
    projects: Project[]
    selectedProjectIds: string[]
    activeProject: string | null
  } | null
  onProjectsFilterChange?: (projectIds: string[]) => void
}

export default function PageSubHeader({
  onAction,
  currentYear,
  onYearChange,
  selectedWeek,
  onWeekChange,
  tasksProjectsData,
  onProjectsFilterChange,
}: PageSubHeaderProps) {
  const location = useLocation()
  const { t } = useSafeTranslation()

  const getSubHeaderContent = () => {
    switch (location.pathname) {
      case '/':
        return { title: t('pages.overview'), actions: [] as const }
      case '/finance':
        return {
          title: t('pages.finance'),
          actions: [
            { id: 'add-category', label: t('actions.addCategory'), icon: Plus, variant: 'primary' as const },
            { id: 'annual-stats', label: t('actions.annualStats'), icon: Target, variant: 'secondary' as const },
          ],
        }
      case '/tasks':
        return {
          title: t('pages.tasks'),
          actions: [
            { id: 'add-task', label: t('actions.newTask'), icon: Plus, variant: 'primary' as const },
            { id: 'calendar', label: t('actions.calendar'), icon: Calendar, variant: 'secondary' as const },
          ],
        }
      case '/notes':
        return {
          title: t('pages.notes'),
          actions: [
            { id: 'add-note', label: t('actions.newNote'), icon: Plus, variant: 'primary' as const },
          ],
        }
      case '/habits':
        return {
          title: t('pages.habits'),
          actions: [
            { id: 'add-habit', label: t('habits.createHabit'), icon: Plus, variant: 'primary' as const },
          ],
        }
      default:
        return null
    }
  }

  const subHeaderContent = getSubHeaderContent()
  if (!subHeaderContent) return null

  const handleAction = (actionId: string) => {
    if (location.pathname === '/tasks') {
      dispatchTasksSubheaderAction(actionId)
      return
    }
    if (location.pathname === '/finance') {
      dispatchFinanceSubheaderAction(actionId)
      return
    }
    onAction?.(actionId)
  }

  return (
    <div className="page-subheader shrink-0 flex items-center min-h-10">
      <div className="flex items-center justify-between w-full gap-3 min-h-10 min-w-0">
        <h1 className="!m-0 !text-lg !font-semibold text-gray-900 leading-none truncate flex items-center">
          {subHeaderContent.title}
        </h1>

        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          {location.pathname === '/' && selectedWeek && onWeekChange && (
            <WeekSelector
              selectedWeek={selectedWeek}
              onWeekChange={onWeekChange}
              maxWeeksBack={3}
            />
          )}

          {location.pathname === '/finance' && currentYear && onYearChange && (
            <YearSelector currentYear={currentYear} onYearChange={onYearChange} />
          )}

          {location.pathname === '/tasks' &&
            tasksProjectsData &&
            tasksProjectsData.activeProject === TASK_PROJECT_ALL && (
              <ProjectFilterDropdown
                projects={tasksProjectsData.projects}
                selectedProjectIds={tasksProjectsData.selectedProjectIds}
                onSelectionChange={(projectIds) => {
                  onProjectsFilterChange?.(projectIds)
                }}
              />
            )}

          {subHeaderContent.actions.map((action) => {
            const Icon = action.icon
            const isPrimary = action.variant === 'primary'

            return (
              <button
                type="button"
                key={action.id}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleAction(action.id)
                }}
                className={`btn modal-btn inline-flex items-center gap-2 flex-shrink-0 whitespace-nowrap ${
                  isPrimary ? '' : 'btn-outline'
                }`}
                aria-label={action.label}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {action.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
