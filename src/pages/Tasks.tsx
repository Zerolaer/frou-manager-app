// Tasks.tsx — Tag tint tweak (alpha 0.2) + UPPERCASE — 2025-08-27T11:57:52.457526Z
import React from 'react'
import { supabase } from '@/lib/supabaseClient'
import TasksMobile from './mobile/TasksMobile'
import { addWeeks, subWeeks, startOfWeek, endOfWeek, format } from 'date-fns'
import ProjectSidebar from '@/components/ProjectSidebar'
import WeekTimeline from '@/components/WeekTimeline'
import ModernTaskModal from '@/components/ModernTaskModal'
import TaskAddModal from '@/components/TaskAddModal'
import RecurringDeleteModal from '@/components/RecurringDeleteModal'
import RecurringEditModal from '@/components/RecurringEditModal'
import MobileDayNavigator from '@/components/MobileDayNavigator'
import MobileTasksDay from '@/components/tasks/MobileTasksDay'
import TaskCalendarModal from '@/components/TaskCalendarModal'
import TasksListView from '@/components/tasks/TasksListView'
import TasksGanttView from '@/components/tasks/TasksGanttView'
import '@/tasks.css'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { TASK_PRIORITIES, TASK_STATUSES, TASK_PROJECT_ALL } from '@/lib/constants'
import { RecurringTaskSettings } from '@/types/recurring'
import { clampToViewport } from '@/features/finance/utils'
import { createPortal } from 'react-dom'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { getPriorityColor, getPriorityText } from '@/lib/taskHelpers'
import { logger } from '@/lib/monitoring'
import { Repeat, Plus, Calendar } from 'lucide-react'

// Task Context Menu component with smart positioning
function TaskContextMenu({ 
  x, y, task, dayKey, onClose, onDuplicate, onToggleStatus, onDelete, t
}: {
  x: number
  y: number
  task: TaskItem | null
  dayKey?: string
  onClose: () => void
  onDuplicate: () => void
  onToggleStatus: () => void
  onDelete: () => void
  t: (key: string) => string
}) {
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [adjustedPos, setAdjustedPos] = React.useState({ x, y })

  // Smart positioning - don't go off screen
  React.useEffect(() => {
    if (!menuRef.current) return

    const menu = menuRef.current
    const rect = menu.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    let adjustedX = x
    let adjustedY = y

    // Check right edge
    if (x + rect.width > viewport.width - 8) {
      adjustedX = viewport.width - rect.width - 8
    }

    // Check left edge
    if (adjustedX < 8) {
      adjustedX = 8
    }

    // Check bottom edge
    if (y + rect.height > viewport.height - 8) {
      adjustedY = viewport.height - rect.height - 8
    }

    // Check top edge
    if (adjustedY < 8) {
      adjustedY = 8
    }

    setAdjustedPos({ x: adjustedX, y: adjustedY })
  }, [x, y])

  // Close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Create portal in document.body like in finance
  return createPortal(
    <>
      <div 
        className="ctx-backdrop" 
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
          backgroundColor: 'transparent'
        }}
      />
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          left: adjustedPos.x,
          top: adjustedPos.y,
          zIndex: 1000
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-60">
          <button
            onClick={onDuplicate}
            className="w-full px-2 py-3 text-left transition-colors rounded-xl text-gray-700 hover:bg-gray-100"
            style={{ fontSize: '13px' }}
          >
            {t('common.duplicate')}
          </button>
          <button
            onClick={onToggleStatus}
            className="w-full px-2 py-3 text-left transition-colors rounded-xl text-gray-700 hover:bg-gray-100"
            style={{ fontSize: '13px' }}
          >
            {task?.status === TASK_STATUSES.CLOSED ? t('tasks.open') : t('tasks.markComplete')}
          </button>
          <button
            onClick={onDelete}
            className="w-full px-2 py-3 text-left transition-colors rounded-xl text-red-600 hover:bg-red-50"
            style={{ fontSize: '13px' }}
          >
            {t('actions.delete')}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

function hexToRgba(hex: string | null | undefined, alpha: number) {
  if (!hex || typeof hex !== 'string' || !/^#?[0-9a-fA-F]{6}$/.test(hex)) return `rgba(0,0,0,0)`;
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

import type { Project, Todo, TaskItem } from '@/types/shared'

export default function Tasks(){
  const { t } = useSafeTranslation()
  const { userId: uid, loading: authLoading } = useSupabaseAuth()
  const { isMobile } = useMobileDetection()
  const [viewTask, setViewTask] = React.useState<TaskItem|null>(null)
  const [taskStack, setTaskStack] = React.useState<TaskItem[]>([]) // Stack of opened tasks
  const [isSubtaskOpen, setIsSubtaskOpen] = React.useState(false) // Flag for subtask modal
  const [mobileDate, setMobileDate] = React.useState(new Date())
  const [viewMode, setViewMode] = React.useState<'weekly' | 'list' | 'gantt'>('weekly') // View mode: weekly, list, or gantt
  const lastParentUpdateRef = React.useRef<string>('') // Track last parent update to prevent loops
  const isSyncingRef = React.useRef<boolean>(false) // Prevent double sync calls
  const lastClickTimeRef = React.useRef<number>(0) // Track last click time to prevent double clicks
  const lastClickedTaskIdRef = React.useRef<string | null>(null) // Track last clicked task to prevent rapid re-clicks
  const isOpeningModalRef = React.useRef<boolean>(false) // Track if modal is currently opening
  
  
  // Calendar state
  const [showCalendar, setShowCalendar] = React.useState(false)
  
  
  // Recurring delete modal state
  const [showRecurringDelete, setShowRecurringDelete] = React.useState(false)
  const [taskToDelete, setTaskToDelete] = React.useState<{ task: TaskItem; dayKey: string } | null>(null)
  
  // Recurring edit modal state
  const [showRecurringEdit, setShowRecurringEdit] = React.useState(false)
  const [taskToEdit, setTaskToEdit] = React.useState<{ task: TaskItem; updates: any } | null>(null)



  // SubHeader actions handler
  function handleSubHeaderAction(action: string) {
    switch (action) {
      case 'add-task':
        setOpenNewTask(true)
        break
      case 'calendar':
        setShowCalendar(true)
        break
      default:
        // Unknown action
    }
  }

  // Listen for view mode changes from Header
  React.useEffect(() => {
    const handleViewModeSelect = (event: CustomEvent) => {
      const newMode = event.detail as 'weekly' | 'list' | 'gantt'
      setViewMode(newMode)
    }
    
    window.addEventListener('tasks-view-mode-select', handleViewModeSelect as EventListener)
    return () => {
      window.removeEventListener('tasks-view-mode-select', handleViewModeSelect as EventListener)
    }
  }, [])

  // Notify Header about view mode changes
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('tasks-view-mode-changed', { detail: viewMode }))
  }, [viewMode])

  // New DnD system with mouse events
  const [draggedTask, setDraggedTask] = React.useState<TaskItem | null>(null)
  const [dragSource, setDragSource] = React.useState<{dayKey: string, index: number} | null>(null)
  const [dropTarget, setDropTarget] = React.useState<{dayKey: string, index: number} | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 })
  const [dragPosition, setDragPosition] = React.useState({ x: 0, y: 0 })
  const [dragStartTimer, setDragStartTimer] = React.useState<NodeJS.Timeout | null>(null)
  const [mouseDownPos, setMouseDownPos] = React.useState({ x: 0, y: 0 })
  const [hasMoved, setHasMoved] = React.useState(false)
  const [draggedCardWidth, setDraggedCardWidth] = React.useState<number | null>(null)
  
  // Use ref to track dragging state for click handler
  const hasMovedRef = React.useRef(false)
  const isDraggingRef = React.useRef(false)

  // Save task info for dragging
  const [pendingDrag, setPendingDrag] = React.useState<{
    task: TaskItem
    dayKey: string
    index: number
  } | null>(null)

  // Simple separation: click = open, hold = drag
  function handleMouseDown(e: React.MouseEvent, task: TaskItem, dayKey: string, index: number) {
    // Disable text selection on mouse hold, but only for left button
    if (e.button === 0) {
      e.preventDefault()
    }

    logger.debug('🖱️ Mouse down on task:', task.title)
    
    // Save click position and task info
    setMouseDownPos({ x: e.clientX, y: e.clientY })
    setHasMoved(false)
    hasMovedRef.current = false
    setPendingDrag({ task, dayKey, index })
  }

  function handleMouseMove(e: MouseEvent | React.MouseEvent) {
    // Check if mouse moved far enough to start dragging
    if (!isDragging && !dragStartTimer) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.x, 2) + 
        Math.pow(e.clientY - mouseDownPos.y, 2)
      )
      
      if (distance > 5 && pendingDrag) { // If mouse moved more than 5px and there's a task to drag
        logger.debug('🚀 Starting drag, distance:', distance)
        setHasMoved(true)
        hasMovedRef.current = true
        
        // Use saved task info from handleMouseDown
        const { task, dayKey, index } = pendingDrag
        
        // Find the original card element and save its width
        const dayCol = document.querySelector(`[data-day-key="${dayKey}"]`)
        if (dayCol) {
          const taskCards = dayCol.querySelectorAll('.task-card')
          const originalCard = taskCards[index] as HTMLElement
          if (originalCard) {
            const rect = originalCard.getBoundingClientRect()
            setDraggedCardWidth(rect.width)
            logger.debug('📏 Saved card width:', rect.width)
          }
        }
        
        setDraggedTask(task)
        setDragSource({ dayKey, index })
        setIsDragging(true)
        isDraggingRef.current = true
        
        setDragOffset({
          x: 0,
          y: 0
        })
        setDragPosition({
          x: e.clientX,
          y: e.clientY
        })
        
        // Clear pending drag
        setPendingDrag(null)
      }
    }
    
    if (!isDragging) return
    
    e.preventDefault()
    setDragPosition({
      x: e.clientX,
      y: e.clientY
    })
    
    // Find drop target - improved logic
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY)
    
    // Try to find day column from element below
    let dayCol = elementBelow?.closest('.day-col')
    
    // If not found, try to find by checking all day columns
    if (!dayCol) {
      const allDayCols = document.querySelectorAll('.day-col')
      
      for (const col of allDayCols) {
        const rect = col.getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          dayCol = col
          break
        }
      }
    }
    
    if (dayCol) {
      const dayKey = dayCol.getAttribute('data-day-key')
      
      if (dayKey) {
        // Find position within the day
        const taskCards = dayCol.querySelectorAll('.task-card:not(.is-dragging)')
        // If we're dragging within the same day, taskCards.length is reduced by 1
        // So we need to add 1 to get the actual end position
        const isSameDay = dragSource?.dayKey === dayKey
        const actualTaskCount = tasks[dayKey]?.length || 0
        let targetIndex = isSameDay ? actualTaskCount : taskCards.length // Default to end
        
        // Check if we're dragging over the day-body area
        const dayBody = dayCol.querySelector('.day-body')
        if (dayBody) {
          const bodyRect = dayBody.getBoundingClientRect()
          const relativeY = e.clientY - bodyRect.top
          const bodyHeight = bodyRect.height
          
          logger.debug('📍 Day body rect:', { relativeY, bodyHeight, mouseY: e.clientY, bodyTop: bodyRect.top })
          
          if (taskCards.length === 0) {
            // Empty column - place at beginning
            targetIndex = 0
          } else {
            // Find position based on cards - no bottom zone interference
            let foundPosition = false
            for (let i = 0; i < taskCards.length; i++) {
              const card = taskCards[i]
              const rect = card.getBoundingClientRect()
              const cardCenter = rect.top + rect.height / 2
              
              logger.debug(`📍 Card ${i}: top=${rect.top}, center=${cardCenter}, mouseY=${e.clientY}, isAbove=${e.clientY < cardCenter}`)
              
              if (e.clientY < cardCenter) {
                // If we're dragging from the same day, we need to adjust the index
                // because the dragged task is hidden from taskCards
                if (isSameDay && dragSource && dragSource.index <= i) {
                  targetIndex = i + 1 // Place after the card we're hovering over
                  logger.debug('📍 Same day drag: adjusting index from', { from: i, to: targetIndex })
                } else {
                  targetIndex = i
                }
                foundPosition = true
                logger.debug('📍 Found position above card', { cardIndex: i, y: rect.top, targetIndex })
                break
              }
            }
            
            // If we didn't find a position above any card, place at end
            if (!foundPosition) {
              targetIndex = isSameDay ? actualTaskCount : taskCards.length
              logger.debug('📍 No position found above cards, placing at end', { isSameDay, actualTaskCount })
            }
          }
        } else {
          // Fallback: if no day-body found, place at end
          targetIndex = isSameDay ? actualTaskCount : taskCards.length
        }
        setDropTarget({ dayKey, index: targetIndex })
      }
    }
  }

  function handleMouseUp(e: MouseEvent | React.MouseEvent) {
    logger.debug('🖱️ Mouse up', { isDragging, hasMoved, hasMovedRef: hasMovedRef.current, isDraggingRef: isDraggingRef.current })
    
    // Clear pending drag on mouse release
    if (pendingDrag) {
      logger.debug('🔄 Clearing pending drag')
      setPendingDrag(null)
    }
    
    // CRITICAL: Only handle drop if we were actually dragging AND moved
    // Use refs for immediate check without state delay
    if (!isDraggingRef.current || !hasMovedRef.current || !draggedTask || !dragSource) {
      logger.debug('❌ NOT CALLING handleDrop - no real drag detected')
      // Clean up drag state
      setDraggedTask(null)
      setDragSource(null)
      setDropTarget(null)
      setIsDragging(false)
      isDraggingRef.current = false
      setDraggedCardWidth(null)
      
      // Reset movement flag with small delay so onClick doesn't fire
      setTimeout(() => {
        setHasMoved(false)
        hasMovedRef.current = false
      }, 100)
      return
    }
    
    logger.debug('✅✅✅ CALLING handleDrop - real drag detected ✅✅✅')
    
    // Find final drop target - use same improved logic
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY)
    
    // Try to find day column from element below
    let dayCol = elementBelow?.closest('.day-col')
    
    // If not found, try to find by checking all day columns
    if (!dayCol) {
      const allDayCols = document.querySelectorAll('.day-col')
      
      for (const col of allDayCols) {
        const rect = col.getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX <= rect.right && 
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          dayCol = col
          break
        }
      }
    }
    
    if (dayCol) {
      const dayKey = dayCol.getAttribute('data-day-key')
      if (dayKey) {
        const taskCards = dayCol.querySelectorAll('.task-card:not(.is-dragging)')
        // If we're dragging within the same day, taskCards.length is reduced by 1
        const isSameDay = dragSource?.dayKey === dayKey
        const actualTaskCount = tasks[dayKey]?.length || 0
        let targetIndex = isSameDay ? actualTaskCount : taskCards.length // Default to end
        
        // Check if we're in the bottom area of the day body
        const dayBody = dayCol.querySelector('.day-body')
        if (dayBody) {
          const bodyRect = dayBody.getBoundingClientRect()
          const relativeY = e.clientY - bodyRect.top
          const bodyHeight = bodyRect.height
          
          logger.debug('📍 Final drop - Day body rect:', { relativeY, bodyHeight, mouseY: e.clientY, bodyTop: bodyRect.top })
          
          if (taskCards.length === 0) {
            // Empty column - place at beginning
            targetIndex = 0
          } else {
            // Find position based on cards - no bottom zone interference
            let foundPosition = false
            for (let i = 0; i < taskCards.length; i++) {
              const card = taskCards[i]
              const rect = card.getBoundingClientRect()
              const cardCenter = rect.top + rect.height / 2
              
              logger.debug(`📍 Final drop - Card ${i}: top=${rect.top}, center=${cardCenter}, mouseY=${e.clientY}, isAbove=${e.clientY < cardCenter}`)
              
              if (e.clientY < cardCenter) {
                // If we're dragging from the same day, we need to adjust the index
                // because the dragged task is hidden from taskCards
                if (isSameDay && dragSource && dragSource.index <= i) {
                  targetIndex = i + 1 // Place after the card we're hovering over
                  logger.debug('📍 Final drop - Same day drag: adjusting index from', { from: i, to: targetIndex })
                } else {
                  targetIndex = i
                }
                foundPosition = true
                logger.debug('📍 Final drop - Found position above card', { cardIndex: i, y: rect.top, targetIndex })
                break
              }
            }
            
            // If we didn't find a position above any card, place at end
            if (!foundPosition) {
              targetIndex = isSameDay ? actualTaskCount : taskCards.length
              logger.debug('📍 Final drop - No position found above cards, placing at end', { isSameDay, actualTaskCount })
            }
          }
        } else {
          // Fallback: if no day-body found, place at end
          targetIndex = isSameDay ? actualTaskCount : taskCards.length
        }
        
        // Perform the drop
        handleDrop(dayKey, targetIndex)
      }
    }
    
    // Clean up
    setDraggedTask(null)
    setDragSource(null)
    setDropTarget(null)
    setIsDragging(false)
    isDraggingRef.current = false
    setHasMoved(false)
    setDraggedCardWidth(null)
    hasMovedRef.current = false
  }

  async function handleDrop(dayKey: string, index: number) {
    logger.debug('📦 handleDrop called:', { dayKey, index, draggedTask: draggedTask?.title, fromDayKey: dragSource?.dayKey, fromIndex: dragSource?.index })
    
    if (!draggedTask || !dragSource || !uid) {
      logger.debug('❌ handleDrop early return - missing data')
      return
    }

    const fromDayKey = dragSource.dayKey
    const fromIndex = dragSource.index
    const toIndex = index

    // Don't do anything if dropped in the same position
    if (fromDayKey === dayKey && fromIndex === toIndex) {
      logger.debug('❌ handleDrop early return - same position')
      return
    }
    
    logger.debug('✅ handleDrop proceeding with move')

    const map = { ...tasks }
    const fromList = [...(map[fromDayKey] || [])]
    const toList = dayKey === fromDayKey ? fromList : [...(map[dayKey] || [])]
    
    // Remove from source
    const [movedItem] = fromList.splice(fromIndex, 1)
    
    // Insert at target position
    if (dayKey === fromDayKey) {
      // Moving within the same day
      const adjustedIndex = toIndex > fromIndex ? toIndex - 1 : toIndex
      toList.splice(adjustedIndex, 0, { ...movedItem, date: dayKey })
    } else {
      // Moving to different day
      toList.splice(toIndex, 0, { ...movedItem, date: dayKey })
    }

    // Update positions
    fromList.forEach((item, idx) => {
      item.position = idx
    })
    toList.forEach((item, idx) => {
      item.position = idx
    })

    // Update state
    setTasks(prev => ({
      ...prev,
      [fromDayKey]: fromList,
      [dayKey]: toList
    }))

    // Persist to database
    try {
      await supabase
        .from('tasks_items')
        .update({ date: dayKey, position: toList.findIndex(item => item.id === movedItem.id) })
        .eq('id', movedItem.id)

      // Update all affected items
      const allItems = [...fromList, ...toList]
      for (const item of allItems) {
        await supabase
          .from('tasks_items')
          .update({ position: item.position })
          .eq('id', item.id)
      }
    } catch (error) {
      logger.error('Error updating task positions:', error)
    }
  }

  // Auth handled by useSupabaseAuth hook

  // timeline
  const [start, setStart] = React.useState<Date>(()=> startOfWeek(new Date(), { weekStartsOn:1 }))
  const [end,   setEnd]   = React.useState<Date>(()=> endOfWeek(new Date(), { weekStartsOn:1 }))
  const todayKey = format(new Date(),'yyyy-MM-dd')
  React.useEffect(()=>{
    setEnd(endOfWeek(start, { weekStartsOn:1 }))
  }, [start])

  // Listen for SubHeader actions
  React.useEffect(() => {
    const handleSubHeaderActionEvent = (event: CustomEvent) => {
      handleSubHeaderAction(event.detail)
    }
    
    window.addEventListener('subheader-action', handleSubHeaderActionEvent as EventListener)
    return () => {
      window.removeEventListener('subheader-action', handleSubHeaderActionEvent as EventListener)
    }
  }, [])

  // Global mouse event handlers for drag and drop
  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMouseMove(e)
    }
    
    const handleGlobalMouseUp = (e: MouseEvent) => {
      handleMouseUp(e)
    }
    
    // Always add handlers to track mouse movement
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, pendingDrag, mouseDownPos, hasMoved, draggedTask, dragSource])

  // projects
  const [projects, setProjects] = React.useState<Project[]>([])
  const [activeProject, setActiveProject] = React.useState<string|null>(TASK_PROJECT_ALL)
  const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('frovo_selected_projects')
    return saved ? JSON.parse(saved) : []
  })
  const [projectsCollapsed, setProjectsCollapsed] = React.useState(() => {
    const saved = localStorage.getItem('frovo_projects_collapsed')
    return saved === 'true'
  })
const projectColorById = React.useMemo(() => {
    const m: Record<string, string|undefined> = {}
    for (const p of projects) m[p.id] = p.color || undefined
    return m
  }, [projects])

  React.useEffect(() => {
    if (!uid) return
    
    ;(async()=>{
      // try extended (color)
      const ext = await supabase.from('tasks_projects').select('id,name,color').order('created_at', { ascending:true })
      if (!ext.error){
        const list = (ext.data || []) as Project[]
        setProjects(list)
        
        // Check if we have saved selection in localStorage
        const saved = localStorage.getItem('frovo_selected_projects')
        if (saved) {
          const savedIds = JSON.parse(saved)
          // Filter to only include projects that still exist
          const validIds = savedIds.filter((id: string) => list.some(p => p.id === id))
          setSelectedProjectIds(validIds.length > 0 ? validIds : list.map(p => p.id))
        } else {
          // First time - select all projects
          setSelectedProjectIds(list.map(p => p.id))
        }
        
        if (!activeProject) setActiveProject(TASK_PROJECT_ALL)
        return
      }
      // fallback to id,name only
      const basic = await supabase.from('tasks_projects').select('id,name').order('created_at', { ascending:true })
      if (!basic.error){
        const list = (basic.data || []) as Project[]
        setProjects(list)
        
        // Check if we have saved selection in localStorage
        const saved = localStorage.getItem('frovo_selected_projects')
        if (saved) {
          const savedIds = JSON.parse(saved)
          // Filter to only include projects that still exist
          const validIds = savedIds.filter((id: string) => list.some(p => p.id === id))
          setSelectedProjectIds(validIds.length > 0 ? validIds : list.map(p => p.id))
        } else {
          // First time - select all projects
          setSelectedProjectIds(list.map(p => p.id))
        }
        
        if (!activeProject) setActiveProject(TASK_PROJECT_ALL)
      }
    })()
}, [uid])

  // tasks for the week of active project
  const [tasks, setTasks] = React.useState<Record<string, TaskItem[]>>({})
  // All tasks for calendar (entire month)
  const [allTasks, setAllTasks] = React.useState<Record<string, TaskItem[]>>({})
  // Force refresh trigger
  const [refreshTrigger, setRefreshTrigger] = React.useState(0)
  // Track last active project to clear cache on project switch
  const lastActiveProject = React.useRef(activeProject)
  // Track current month for calendar
  const [calendarMonth, setCalendarMonth] = React.useState(new Date())
  
  React.useEffect(() => {
    if (!uid || !activeProject) { 
      setTasks({})
      return
    }
    
    // Clear all tasks when switching projects
    if (lastActiveProject.current !== activeProject) {
      setTasks({})
      lastActiveProject.current = activeProject
    }
    
    let cancelled = false
    
    const fetchTasks = async () => {
      const startDate = format(start, 'yyyy-MM-dd')
      const endDate = format(end, 'yyyy-MM-dd')
      
      const q = supabase.from('tasks_items')
        .select('id,project_id,title,description,date,start_date,due_date,position,priority,tag,todos,status,recurring_task_id,tasks_projects(name)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date',     { ascending:true })
        .order('position', { ascending:true })
      
      // Filter: 'ALL' shows tasks from selected projects, specific project shows only that project's tasks
      let query = q
      if (activeProject === TASK_PROJECT_ALL) {
        // If in "All Projects" mode, filter by selected projects
        if (selectedProjectIds.length > 0) {
          query = q.in('project_id', selectedProjectIds)
        }
        // If no projects selected, we'll get empty result (which is correct)
      } else {
        // Specific project selected
        query = q.eq('project_id', activeProject)
      }
      
      const { data, error } = await query
      
      
      if (cancelled) return
      
      if (error) {
        logger.error('❌ Error fetching tasks:', error)
        return
      }
      
      const map: Record<string, TaskItem[]> = {}
      ;(data || []).forEach((t: any) => {
        const key = t.date as string
        ;(map[key] ||= []).push({ 
          id: t.id, 
          project_id: t.project_id, 
          title: t.title, 
          description: t.description, 
          date: t.date, 
          position: t.position, 
          priority: t.priority, 
          tag: t.tag, 
          todos: (t.todos||[]), 
          status: t.status || TASK_STATUSES.OPEN,
          project_name: t.tasks_projects?.name || null,
          recurring_task_id: t.recurring_task_id
        })
      })
      
      // Update state with new data for this week's date range
      setTasks(prev => {
        const next = { ...prev }
        
        // First, clear all dates in the current week range (to remove stale data)
        const currentWeekDates: string[] = []
        for (let i = 0; i < 7; i++) {
          const d = new Date(start)
          d.setDate(d.getDate() + i)
          const dateKey = format(d, 'yyyy-MM-dd')
          currentWeekDates.push(dateKey)
        }
        
        // Set all current week dates to what we got from DB (or empty array if not in map)
        currentWeekDates.forEach(dateKey => {
          next[dateKey] = map[dateKey] || []
        })
        
        return next
      })
    }
    
    fetchTasks()
    
    return () => {
      cancelled = true
    }
  }, [uid, activeProject, start, end, selectedProjectIds, refreshTrigger])

  // Update all recurring tasks once on mount to create missing instances
  // Use ref to ensure it only runs once
  const hasUpdatedRecurringTasks = React.useRef(false)
  React.useEffect(() => {
    if (!uid || hasUpdatedRecurringTasks.current) return
    
    hasUpdatedRecurringTasks.current = true
    console.log('🔄 Running updateAllRecurringTasks on mount...')
    updateAllRecurringTasks().catch(err => {
      console.error('Error updating recurring tasks on mount:', err)
      hasUpdatedRecurringTasks.current = false // Reset on error so it can retry
    })
  }, [uid]) // Only run once when uid is available

  // Load all tasks for calendar (based on calendar month)
  React.useEffect(() => {
    if (!uid || !activeProject) { 
      setAllTasks({})
      return
    }
    
    let cancelled = false
    
    const fetchAllTasks = async () => {
      const startOfMonthDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
      const endOfMonthDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)
      
      const startDate = format(startOfMonthDate, 'yyyy-MM-dd')
      const endDate = format(endOfMonthDate, 'yyyy-MM-dd')
      
      const q = supabase.from('tasks_items')
        .select('id,project_id,title,description,date,position,priority,tag,todos,status,recurring_task_id,tasks_projects(name)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('position', { ascending: true })
      
      // Filter logic similar to main tasks fetch
      let query = q
      if (activeProject === TASK_PROJECT_ALL) {
        if (selectedProjectIds.length > 0) {
          query = q.in('project_id', selectedProjectIds)
        }
      } else {
        query = q.eq('project_id', activeProject)
      }
      
      const { data, error } = await query
      
      if (cancelled) return
      
      if (error) {
        logger.error('Error fetching all tasks:', error)
        return
      }
      
      if (data) {
        const taskMap: Record<string, TaskItem[]> = {}
        
        data.forEach((task: any) => {
          const dayKey = task.date
          if (!taskMap[dayKey]) {
            taskMap[dayKey] = []
          }
          
          taskMap[dayKey].push({
            ...task,
            project_name: task.tasks_projects?.name || 'No Project'
          })
        })
        
        setAllTasks(taskMap)
      }
    }
    
    fetchAllTasks()
    
    return () => {
      cancelled = true
    }
  }, [uid, activeProject, calendarMonth, selectedProjectIds])

// context menu state for task cards
  const [ctx, setCtx] = React.useState<{ open: boolean; x: number; y: number; task: TaskItem | null; dayKey?: string }>({
    open: false, x: 0, y: 0, task: null, dayKey: undefined
  })

  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setCtx(c => ({ ...c, open: false })) }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [])

  async function duplicateTask(task: TaskItem, dayKey: string){
    try{
      const list = (tasks[dayKey] || [])
      const newPos = list.length
      const { data, error } = await supabase
        .from('tasks_items')
        .insert({
          project_id: task.project_id || null,
          title: task.title,
          description: task.description || null,
          date: dayKey,
          position: newPos,
          priority: task.priority || null,
          tag: task.tag || null,
          todos: Array.isArray(task.todos) ? task.todos : [],
          status: task.status || TASK_STATUSES.OPEN,
          user_id: uid
        })
        .select('id,project_id,title,description,date,position,priority,tag,todos,status,tasks_projects(name)').single()
      if (error) {
        logger.error('Error duplicating task:', error)
        throw error
      }
      if (data){
        const t: TaskItem = {
          id: data.id,
          project_id: data.project_id || undefined,
          title: data.title,
          description: data.description || undefined,
          date: data.date as string,
          position: data.position as number,
          priority: data.priority || undefined,
          tag: data.tag || undefined,
          todos: (data.todos||[]) as Todo[],
          status: (data.status as any) || TASK_STATUSES.OPEN,
          project_name: (data as any).tasks_projects?.name || null
        }
        const map = { ...tasks }
        ;(map[dayKey] ||= []).push(t)
        setTasks(map)
      }
    } catch (error) {
      logger.error('Error duplicating task:', error)
    } finally {
      setCtx(c => ({ ...c, open: false }))
    }
  }

  async function deleteTask(task: TaskItem, dayKey: string){
    // Check if this is a recurring task
    if (task.recurring_task_id) {
      // Check in database how many tasks have the same recurring_task_id
      // This is more reliable than checking local state, which may only have current week's tasks
      const { count, error: countError } = await supabase
        .from('tasks_items')
        .select('*', { count: 'exact', head: true })
        .eq('recurring_task_id', task.recurring_task_id)
      
      if (!countError && count !== null) {
        const taskCount = count
        console.log(`🔍 Found ${taskCount} tasks with recurring_task_id: ${task.recurring_task_id}`)
        
        if (taskCount > 1) {
          // Show recurring delete modal
          setTaskToDelete({ task, dayKey })
          setShowRecurringDelete(true)
          setCtx(c => ({ ...c, open: false }))
          return
        }
      }
    }
    
    // Delete single task (either non-recurring or the last recurring task)
    await deleteSingleTask(task, dayKey)
  }
  
  async function deleteSingleTask(task: TaskItem, dayKey: string) {
    try{
      console.log(`🗑️ Deleting single task: ${task.id}`)
      
      // If this is a recurring task, check if it's the last one
      if (task.recurring_task_id) {
        // Count remaining tasks with this recurring_task_id (including the one we're about to delete)
        const { count, error: countError } = await supabase
          .from('tasks_items')
          .select('*', { count: 'exact', head: true })
          .eq('recurring_task_id', task.recurring_task_id)
        
        if (!countError && count !== null) {
          console.log(`🔍 Total tasks with recurring_task_id ${task.recurring_task_id}: ${count}`)
          
          // If this is the last task (count === 1), also deactivate the recurring task
          if (count === 1) {
            console.log(`⚠️ This is the last task, deactivating recurring task...`)
            const { error: deactivateError } = await supabase
              .from('recurring_tasks')
              .update({ is_active: false })
              .eq('id', task.recurring_task_id)
            
            if (deactivateError) {
              console.error('Error deactivating recurring task:', deactivateError)
            } else {
              console.log(`✅ Deactivated recurring task: ${task.recurring_task_id}`)
            }
          }
        }
      }
      
      // IMPORTANT: Delete only this specific task by ID, not by recurring_task_id
      // This ensures we don't accidentally delete other tasks with the same recurring_task_id
      console.log(`🔍 About to delete task with ID: ${task.id}, date: ${task.date}, recurring_task_id: ${task.recurring_task_id}`)
      
      // First, verify the task exists and get its details
      const { data: taskToDelete, error: fetchError } = await supabase
        .from('tasks_items')
        .select('id, date, recurring_task_id, title')
        .eq('id', task.id)
        .single()
      
      if (fetchError || !taskToDelete) {
        console.error('❌ Task not found or error fetching:', fetchError)
        throw fetchError || new Error('Task not found')
      }
      
      console.log(`📋 Task to delete:`, taskToDelete)
      
      // Verify there are other tasks with the same recurring_task_id
      if (task.recurring_task_id) {
        const { data: otherTasks, error: otherTasksError } = await supabase
          .from('tasks_items')
          .select('id, date')
          .eq('recurring_task_id', task.recurring_task_id)
          .neq('id', task.id) // Exclude the task we're about to delete
        
        console.log(`🔍 Other tasks with same recurring_task_id:`, otherTasks)
        
        if (otherTasksError) {
          console.error('Error fetching other tasks:', otherTasksError)
        }
      }
      
      const { error: deleteError, data: deleteResult } = await supabase
        .from('tasks_items')
        .delete()
        .eq('id', task.id) // Delete ONLY this specific task
        .select() // Return deleted rows to verify
      
      if (deleteError) {
        logger.error('Error deleting task:', deleteError)
        console.error('❌ Delete error:', deleteError)
        throw deleteError
      }
      
      console.log(`✅ Deleted task: ${task.id} (date: ${task.date})`)
      console.log(`📊 Delete result:`, deleteResult)
      
      // Verify the task was actually deleted and others remain
      if (task.recurring_task_id) {
        const { data: remainingTasks, error: remainingError } = await supabase
          .from('tasks_items')
          .select('id, date')
          .eq('recurring_task_id', task.recurring_task_id)
        
        console.log(`🔍 Remaining tasks with same recurring_task_id:`, remainingTasks)
        
        if (remainingError) {
          console.error('Error fetching remaining tasks:', remainingError)
        }
      }
      
      // Update local state
      const map = { ...tasks }
      const list = map[dayKey] || []
      const idx = list.findIndex(x => x.id === task.id)
      if (idx >= 0){ list.splice(idx,1); map[dayKey] = list }
      setTasks(map)
      
      // Also update allTasks for calendar view
      const allTasksMap = { ...allTasks }
      const allTasksList = allTasksMap[dayKey] || []
      const allTasksIdx = allTasksList.findIndex(x => x.id === task.id)
      if (allTasksIdx >= 0) {
        allTasksList.splice(allTasksIdx, 1)
        allTasksMap[dayKey] = allTasksList
        if (allTasksList.length === 0) {
          delete allTasksMap[dayKey]
        }
      }
      setAllTasks(allTasksMap)
      
      // Trigger refresh
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      logger.error('Error deleting task:', error)
      console.error('❌ Error deleting task:', error)
    } finally {
      setCtx(c => ({ ...c, open: false }))
      setShowRecurringDelete(false)
      setTaskToDelete(null)
    }
  }
  
  async function deleteAllRecurringTasks(task: TaskItem) {
    if (!task.recurring_task_id) return
    
    try {
      console.log(`🗑️ Deleting all recurring tasks with id: ${task.recurring_task_id}`)
      
      // First, delete all task instances with the same recurring_task_id
      const { error: deleteTasksError } = await supabase
        .from('tasks_items')
        .delete()
        .eq('recurring_task_id', task.recurring_task_id)
      
      if (deleteTasksError) {
        console.error('Error deleting task instances:', deleteTasksError)
        throw deleteTasksError
      }
      
      console.log(`✅ Deleted all task instances for recurring_task_id: ${task.recurring_task_id}`)
      
      // Then, deactivate or delete the recurring task itself
      // Deactivating is safer in case of foreign key constraints
      const { error: deactivateError } = await supabase
        .from('recurring_tasks')
        .update({ is_active: false })
        .eq('id', task.recurring_task_id)
      
      if (deactivateError) {
        console.error('Error deactivating recurring task:', deactivateError)
        // Try to delete instead if update fails
        const { error: deleteRecurringError } = await supabase
          .from('recurring_tasks')
          .delete()
          .eq('id', task.recurring_task_id)
        
        if (deleteRecurringError) {
          console.error('Error deleting recurring task:', deleteRecurringError)
          throw deleteRecurringError
        }
        console.log(`✅ Deleted recurring task record: ${task.recurring_task_id}`)
      } else {
        console.log(`✅ Deactivated recurring task: ${task.recurring_task_id}`)
      }
      
      // Update local state - remove all tasks with this recurring_task_id
      const map = { ...tasks }
      Object.keys(map).forEach(date => {
        map[date] = map[date].filter(t => t.recurring_task_id !== task.recurring_task_id)
        if (map[date].length === 0) {
          delete map[date]
        }
      })
      setTasks(map)
      
      // Also update allTasks for calendar view
      const allTasksMap = { ...allTasks }
      Object.keys(allTasksMap).forEach(date => {
        allTasksMap[date] = allTasksMap[date].filter(t => t.recurring_task_id !== task.recurring_task_id)
        if (allTasksMap[date].length === 0) {
          delete allTasksMap[date]
        }
      })
      setAllTasks(allTasksMap)
      
      // Trigger refresh to ensure UI is updated
      setRefreshTrigger(prev => prev + 1)
      
      logger.debug(`✅ Deleted all recurring tasks with id: ${task.recurring_task_id}`)
      console.log(`✅ Successfully deleted all recurring tasks`)
    } catch (error) {
      console.error('❌ Error deleting recurring tasks:', error)
      logger.error('Error deleting recurring tasks:', error)
    } finally {
      setShowRecurringDelete(false)
      setTaskToDelete(null)
    }
  }

  async function editSingleTask(task: TaskItem, updates: any) {
    try {
      // Remove computed fields that don't exist in database and primary key
      const { project_name, created_at, updated_at, id, ...dbUpdates } = updates
      
      const { error } = await supabase
        .from('tasks_items')
        .update(dbUpdates)
        .eq('id', task.id)
      
      if (error) throw error
      
      // Update local state
      const map = { ...tasks }
      Object.keys(map).forEach(date => {
        const taskIndex = map[date].findIndex(t => t.id === task.id)
        if (taskIndex >= 0) {
          map[date][taskIndex] = { ...map[date][taskIndex], ...updates }
        }
      })
      setTasks(map)
    } catch (error) {
      logger.error('Error updating task:', error)
    } finally {
      setShowRecurringEdit(false)
      setTaskToEdit(null)
    }
  }

  async function editAllRecurringTasks(task: TaskItem, updates: any) {
    if (!task.recurring_task_id) return
    
    try {
      // Remove computed fields that don't exist in database, primary key, and date (to preserve individual task dates)
      const { project_name, created_at, updated_at, id, date, ...dbUpdates } = updates
      
      // Update all tasks with the same recurring_task_id
      const { error } = await supabase
        .from('tasks_items')
        .update(dbUpdates)
        .eq('recurring_task_id', task.recurring_task_id)
      
      if (error) throw error
      
      // Update local state (preserve individual task dates)
      const map = { ...tasks }
      const { date: _, ...updatesWithoutDate } = updates // Remove date from updates
      Object.keys(map).forEach(date => {
        map[date] = map[date].map(t => 
          t.recurring_task_id === task.recurring_task_id 
            ? { ...t, ...updatesWithoutDate }
            : t
        )
      })
      setTasks(map)
      
      logger.debug(`Updated recurring tasks with id: ${task.recurring_task_id}`)
    } catch (error) {
      logger.error('Error updating recurring tasks:', error)
    } finally {
      setShowRecurringEdit(false)
      setTaskToEdit(null)
    }
  }

  async function toggleTaskStatus(task: TaskItem, dayKey: string){
    try{
      const newStatus = task.status === TASK_STATUSES.CLOSED ? TASK_STATUSES.OPEN : TASK_STATUSES.CLOSED
      await supabase.from('tasks_items').update({status: newStatus}).eq('id', task.id)
      const map = { ...tasks }
      const list = map[dayKey] || []
      const idx = list.findIndex(x => x.id === task.id)
      if (idx >= 0){ 
        list[idx] = { ...list[idx], status: newStatus }
        map[dayKey] = list
        setTasks(map)
      }
    } finally {
      setCtx(c => ({ ...c, open: false }))
    }
  }


  // days of current week
  const days = React.useMemo(() => {
    const arr: Date[] = []
    const d0 = new Date(start)
    for (let i=0; i<7; i++) {
      arr.push(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i))
    }
    return arr
  }, [start])

  // create project modal
  const [openNewProject, setOpenNewProject] = React.useState(false)
  const [projectName, setProjectName] = React.useState('')
  async function createProject(){
    if (!uid) return
    const name = projectName.trim()
    if (!name) return
    const { data, error } = await supabase.from('tasks_projects')
      .insert({ user_id: uid, name })
      .select('id,name').single()
    if (!error && data){
      const next = [...projects, { id:data.id, name:data.name }]
      setProjects(next)
      if (!activeProject) setActiveProject(data.id)
      setProjectName('')
      setOpenNewProject(false)
    } else if (error) {
      logger.error('Error creating project:', error)
    }
  }

  // create task modal
  const [openNewTask, setOpenNewTask] = React.useState(false)
  const [taskDate, setTaskDate] = React.useState<Date|null>(null)
  const [taskTitle, setTaskTitle] = React.useState('')
  const [taskDesc, setTaskDesc] = React.useState('')

  // Send projects data to App/Header whenever they change
  React.useEffect(() => {
    if (projects.length > 0) {
      window.dispatchEvent(new CustomEvent('tasks-projects-data', { 
        detail: {
          projects,
          selectedProjectIds,
          activeProject
        }
      }))
    }
  }, [projects, selectedProjectIds, activeProject])

  // Save selected projects to localStorage
  React.useEffect(() => {
    if (selectedProjectIds.length > 0) {
      localStorage.setItem('frovo_selected_projects', JSON.stringify(selectedProjectIds))
    }
  }, [selectedProjectIds])

  // Listen for project filter changes from Header
  React.useEffect(() => {
    const handleProjectsFilterChange = (event: CustomEvent) => {
      setSelectedProjectIds(event.detail)
    }
    
    window.addEventListener('tasks-projects-filter-change', handleProjectsFilterChange as EventListener)
    return () => {
      window.removeEventListener('tasks-projects-filter-change', handleProjectsFilterChange as EventListener)
    }
  }, [])

  // Function to create recurring tasks
  async function createRecurringTasks(
    startDate: Date,
    projectId: string | null,
    title: string,
    description: string,
    priority: string,
    tag: string,
    todos: Todo[],
    recurringSettings: RecurringTaskSettings
  ) {
    if (!uid) return

    try {
      // Import the utility function
      const { generateRecurringTaskInstances } = await import('@/utils/recurringUtils')
      
      // Generate all task instances
      console.log(`🔄 Generating instances for startDate: ${format(startDate, 'yyyy-MM-dd')}, settings:`, recurringSettings)
      const instances = generateRecurringTaskInstances(startDate, recurringSettings)
      console.log(`📅 Generated ${instances.length} instances:`, instances.map(i => i.date))
      
      logger.debug('🔄 Creating recurring tasks:', { 
        title, 
        instancesCount: instances.length,
        startDate: format(startDate, 'yyyy-MM-dd')
      })

      // First, create a record in recurring_tasks table with the settings
      const { data: recurringTaskData, error: recurringError } = await supabase
        .from('recurring_tasks')
        .insert({
          user_id: uid,
          title,
          description,
          priority,
          tag,
          todos,
          project_id: projectId,
          recurrence_type: recurringSettings.recurrenceType,
          recurrence_interval: recurringSettings.interval || recurringSettings.recurrenceInterval || 1,
          recurrence_day_of_week: recurringSettings.dayOfWeek || recurringSettings.recurrenceDayOfWeek,
          recurrence_day_of_month: recurringSettings.dayOfMonth || recurringSettings.recurrenceDayOfMonth,
          // Format date as YYYY-MM-DD in local timezone to avoid UTC shift
          // CRITICAL: Use the CORRECTED date for monthly tasks, not the original startDate
          start_date: (() => {
            // For monthly tasks with dayOfMonth, use the corrected date
            if (recurringSettings.recurrenceType === 'monthly' && recurringSettings.recurrenceDayOfMonth !== undefined) {
              const dayOfMonth = recurringSettings.recurrenceDayOfMonth
              const startDay = startDate.getDate()
              let correctedDate = new Date(startDate)
              
              if (startDay !== dayOfMonth) {
                if (startDay < dayOfMonth) {
                  const lastDayOfMonth = new Date(correctedDate.getFullYear(), correctedDate.getMonth() + 1, 0).getDate()
                  const targetDay = Math.min(dayOfMonth, lastDayOfMonth)
                  correctedDate.setDate(targetDay)
                } else {
                  correctedDate.setMonth(correctedDate.getMonth() + 1)
                  const lastDayOfMonth = new Date(correctedDate.getFullYear(), correctedDate.getMonth() + 1, 0).getDate()
                  const targetDay = Math.min(dayOfMonth, lastDayOfMonth)
                  correctedDate.setDate(targetDay)
                }
              }
              console.log(`📅 Saving start_date for monthly task: ${format(startDate, 'yyyy-MM-dd')} -> ${format(correctedDate, 'yyyy-MM-dd')}`)
              return format(correctedDate, 'yyyy-MM-dd')
            }
            return format(startDate, 'yyyy-MM-dd')
          })(),
          end_date: typeof recurringSettings.endDate === 'string' 
            ? recurringSettings.endDate 
            : (recurringSettings.endDate ? format(recurringSettings.endDate, 'yyyy-MM-dd') : null),
          is_active: true
        })
        .select()
        .single()

      if (recurringError) {
        logger.error('❌ Error creating recurring task record:', recurringError)
        throw recurringError
      }

      const recurringTaskId = recurringTaskData.id
      logger.debug('✅ Created recurring task record:', recurringTaskId)

      // Create tasks for each instance
      const createdTasks: TaskItem[] = []
      const taskMap = { ...tasks }
      
      // Check for duplicates before creating tasks
      const instanceDates = instances.map(inst => inst.date)
      console.log('📅 Generated instance dates:', instanceDates)
      
      // Check which dates already have tasks with this recurring_task_id
      const { data: existingTasks } = await supabase
        .from('tasks_items')
        .select('date')
        .eq('recurring_task_id', recurringTaskId)
        .in('date', instanceDates)
      
      const existingDatesSet = new Set(existingTasks?.map(t => t.date) || [])
      console.log('🔍 Existing dates:', Array.from(existingDatesSet))

      for (const instance of instances) {
        // Skip if task already exists for this date and recurring_task_id
        if (existingDatesSet.has(instance.date)) {
          console.log(`⏭️ Skipping duplicate: ${instance.date}`)
          continue
        }
        
        const nextPos = (taskMap[instance.date]?.length || 0)
        
        const { data, error } = await supabase.from('tasks_items')
          .insert({ 
            project_id: projectId, 
            title, 
            description, 
            date: instance.date, 
            position: nextPos, 
            priority, 
            tag, 
            todos, 
            user_id: uid,
            recurring_task_id: recurringTaskId
          })
          .select('id,project_id,title,description,date,position,priority,tag,todos,status,recurring_task_id,tasks_projects(name)').single()

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
            todos: (data.todos||[]),
            status: data.status || TASK_STATUSES.OPEN,
            project_name: (data as any).tasks_projects?.name || null,
            recurring_task_id: data.recurring_task_id
          }
          createdTasks.push(newTask)
          ;(taskMap[instance.date] ||= []).push(newTask)
          console.log(`✅ Created task for ${instance.date}`)
        } else if (error) {
          logger.error('❌ Error creating recurring task instance:', error)
          console.error(`❌ Error creating task for ${instance.date}:`, error)
        }
      }

      // Update tasks state
      setTasks(taskMap)
      
      // Show success message
      logger.debug(`Created ${createdTasks.length} recurring task instances`)
      
      setTaskTitle('')
      setTaskDesc('')
      setOpenNewTask(false)

    } catch (error) {
      logger.error('Error creating recurring tasks:', error)
    }
  }

    async function createTask(titleFromModal?: string, descFromModal?: string, priorityFromModal?: string, tagFromModal?: string, todosFromModal?: Todo[], projectIdFromModal?: string, dateFromModal?: Date, recurringSettings?: RecurringTaskSettings){
      if (!uid) return
      
      // Debug: check if recurring settings are passed correctly
      if (import.meta.env.DEV && recurringSettings?.isRecurring) {
        console.log('🔄 Creating recurring task:', recurringSettings)
      }
    
    logger.debug('🔧 createTask called with:', {
      projectIdFromModal,
      projectIdType: typeof projectIdFromModal,
      activeProject,
      projectsLength: projects.length,
      firstProjectId: projects[0]?.id
    })
    
    // Determine project for the task
    // NOTE: project_id is nullable - tasks can exist without a project
    let resolvedProject: string | null = null
    
    if (projectIdFromModal !== undefined && projectIdFromModal !== '') {
      // User explicitly selected a specific project in modal
      resolvedProject = projectIdFromModal
      logger.debug('✅ Project explicitly set from modal:', resolvedProject)
    } else if (projectIdFromModal === '') {
      // User selected "No project" (empty string) - task without project
      resolvedProject = null
      logger.debug('✅ Task without project (null)')
    } else if (activeProject && activeProject !== TASK_PROJECT_ALL) {
      // Use active project if it's not "All projects"
      resolvedProject = activeProject
      logger.debug('✅ Using active project:', resolvedProject)
    } else if (projects.length > 0) {
      // Fallback to first project ("Uncategorized")
      resolvedProject = projects[0].id
      logger.debug('⚠️ Fallback to first project:', resolvedProject)
    }
    // If no projects exist and no project selected, resolvedProject stays null
    
    logger.debug('🎯 Final resolvedProject:', resolvedProject)
    
    const title = (titleFromModal ?? taskTitle).trim()
    const desc  = (descFromModal ?? taskDesc)
    const priority = (priorityFromModal ?? TASK_PRIORITIES.NORMAL)
    const tag = (tagFromModal ?? '')
    const todos = (Array.isArray(todosFromModal) ? todosFromModal! : [])
    if (!title) return
    
    // Use date from modal or fallback to taskDate
    const targetDate = dateFromModal || taskDate || new Date()
    const key = format(targetDate, 'yyyy-MM-dd')
    const nextPos = (tasks[key]?.length || 0)

    console.log(`📅 createTask called with dateFromModal: ${dateFromModal ? format(dateFromModal, 'yyyy-MM-dd') : 'null'}, taskDate: ${taskDate ? format(taskDate, 'yyyy-MM-dd') : 'null'}, targetDate: ${format(targetDate, 'yyyy-MM-dd')}`)

    // Handle recurring tasks
    if (recurringSettings?.isRecurring && recurringSettings.recurrenceType) {
      console.log(`🔄 Creating RECURRING task only (not creating single task)`)
      console.log(`📅 Target date for recurring task: ${format(targetDate, 'yyyy-MM-dd')} (day=${targetDate.getDate()})`)
      await createRecurringTasks(targetDate, resolvedProject, title, desc, priority, tag, todos, recurringSettings)
      return // CRITICAL: Don't create a single task if it's recurring!
    } else {
      // Create single task
    const { data, error } = await supabase.from('tasks_items')
      .insert({ project_id: resolvedProject, title, description: desc, date: key, position: nextPos, priority, tag, todos, user_id: uid })
      .select('id,project_id,title,description,date,position,priority,tag,todos,status,tasks_projects(name)').single()
      
    if (!error && data){
      const newTask: TaskItem = { 
        id: data.id, 
        project_id: data.project_id, 
        title: data.title, 
        description: data.description, 
        date: data.date, 
        position: data.position, 
        priority: data.priority, 
        tag: data.tag, 
        todos: (data.todos||[]),
        status: data.status || TASK_STATUSES.OPEN,
        project_name: (data as any).tasks_projects?.name || null
      }
      const map = { ...tasks }
      ;(map[key] ||= []).push(newTask)
      setTasks(map)
      setTaskTitle(''); setTaskDesc('')
      setOpenNewTask(false)
    } else if (error) {
      logger.error('Error creating task:', error)
      }
    }
  }

  // Function to update recurring task settings
  const updateRecurringTaskSettings = async (taskId: string, settings: RecurringTaskSettings) => {
    if (!uid) return

    console.log('📋 updateRecurringTaskSettings called with:', { taskId, settings })

    try {
      // Find the task
      const task = Object.values(tasks).flat().find(t => t.id === taskId)
      if (!task) {
        console.error('❌ Task not found:', taskId)
        return
      }
      
      console.log('✅ Task found:', task)

      if (task.recurring_task_id) {
        // Task is already recurring - get old settings first
        const { data: oldRecurringTask, error: fetchError } = await supabase
          .from('recurring_tasks')
          .select('*')
          .eq('id', task.recurring_task_id)
          .single()

        if (fetchError) {
          console.error('Error fetching old recurring task:', fetchError)
          throw fetchError
        }

        const oldEndDate = oldRecurringTask?.end_date ? new Date(oldRecurringTask.end_date) : null
        const newEndDate = settings.endDate ? (typeof settings.endDate === 'string' ? new Date(settings.endDate) : settings.endDate) : null
        const newEndDateStr = settings.endDate 
          ? (typeof settings.endDate === 'string' ? settings.endDate : settings.endDate.toISOString().split('T')[0])
          : null

        // Update recurring task settings
        const updateData: any = {
          recurrence_type: settings.recurrenceType,
          recurrence_interval: settings.interval || settings.recurrenceInterval || 1,
          recurrence_day_of_week: settings.dayOfWeek || settings.recurrenceDayOfWeek,
          recurrence_day_of_month: settings.dayOfMonth || settings.recurrenceDayOfMonth
        }
        
        // Only include end_date if it's set (null is valid to remove end date)
        if (settings.endDate !== undefined) {
          updateData.end_date = newEndDateStr
        }

        const { error } = await supabase
          .from('recurring_tasks')
          .update(updateData)
          .eq('id', task.recurring_task_id)

        if (error) {
          console.error('Error updating recurring task settings:', error)
          throw error
        }

        // Handle end date changes: create or delete tasks
        if (oldEndDate && newEndDate && newEndDate > oldEndDate) {
          // End date increased - create tasks from old end date to new end date
          console.log('📅 End date increased, creating new tasks...')
          const { generateRecurringTaskInstances } = await import('@/utils/recurringUtils')
          
          // Generate instances for the new date range
          const startDate = new Date(oldEndDate)
          startDate.setDate(startDate.getDate() + 1) // Start from day after old end date
          
          const instances = generateRecurringTaskInstances(startDate, {
            ...settings,
            endDate: newEndDate
          })

          // Filter to only dates between old and new end date
          const tasksToCreate = instances
            .filter(inst => {
              const instDate = new Date(inst.date)
              return instDate > oldEndDate && instDate <= newEndDate
            })
            .map(inst => ({
              user_id: uid,
              project_id: task.project_id,
              title: task.title,
              description: task.description || '',
              priority: task.priority || 'normal',
              tag: task.tag || '',
              date: inst.date,
              position: 0,
              todos: task.todos || [],
              status: 'open',
              recurring_task_id: task.recurring_task_id
            }))

          if (tasksToCreate.length > 0) {
            // Check which tasks already exist - check by both date AND recurring_task_id
            const existingDates = tasksToCreate.map(t => t.date)
            const { data: existingTasks } = await supabase
              .from('tasks_items')
              .select('date, recurring_task_id')
              .eq('recurring_task_id', task.recurring_task_id)
              .in('date', existingDates)

            // Create a set of existing date+recurring_task_id combinations
            const existingKeys = new Set(
              existingTasks?.map(t => `${t.date}_${t.recurring_task_id}`) || []
            )
            
            const tasksToInsert = tasksToCreate.filter(t => {
              const key = `${t.date}_${t.recurring_task_id}`
              return !existingKeys.has(key)
            })

            if (tasksToInsert.length > 0) {
              const { error: insertError } = await supabase
                .from('tasks_items')
                .insert(tasksToInsert)

              if (insertError) {
                console.error('Error creating new task instances:', insertError)
                throw insertError
              }
              console.log(`✅ Created ${tasksToInsert.length} new task instances`)
            }
          }
        } else if (oldEndDate && newEndDate && newEndDate < oldEndDate) {
          // End date decreased - delete tasks after new end date
          console.log('📅 End date decreased, deleting tasks after new end date...')
          const { error: deleteError } = await supabase
            .from('tasks_items')
            .delete()
            .eq('recurring_task_id', task.recurring_task_id)
            .gt('date', newEndDateStr)

          if (deleteError) {
            console.error('Error deleting task instances:', deleteError)
            throw deleteError
          }
          console.log('✅ Deleted tasks after new end date')
        } else if (!oldEndDate && newEndDate) {
          // End date was added - create tasks from today to new end date
          console.log('📅 End date added, creating tasks...')
          const { generateRecurringTaskInstances } = await import('@/utils/recurringUtils')
          
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const instances = generateRecurringTaskInstances(today, {
            ...settings,
            endDate: newEndDate
          })

          const tasksToCreate = instances
            .filter(inst => {
              const instDate = new Date(inst.date)
              return instDate <= newEndDate
            })
            .map(inst => ({
              user_id: uid,
              project_id: task.project_id,
              title: task.title,
              description: task.description || '',
              priority: task.priority || 'normal',
              tag: task.tag || '',
              date: inst.date,
              position: 0,
              todos: task.todos || [],
              status: 'open',
              recurring_task_id: task.recurring_task_id
            }))

          if (tasksToCreate.length > 0) {
            // Check which tasks already exist - check by both date AND recurring_task_id
            const existingDates = tasksToCreate.map(t => t.date)
            const { data: existingTasks } = await supabase
              .from('tasks_items')
              .select('date, recurring_task_id')
              .eq('recurring_task_id', task.recurring_task_id)
              .in('date', existingDates)

            // Create a set of existing date+recurring_task_id combinations
            const existingKeys = new Set(
              existingTasks?.map(t => `${t.date}_${t.recurring_task_id}`) || []
            )
            
            const tasksToInsert = tasksToCreate.filter(t => {
              const key = `${t.date}_${t.recurring_task_id}`
              return !existingKeys.has(key)
            })

            if (tasksToInsert.length > 0) {
              const { error: insertError } = await supabase
                .from('tasks_items')
                .insert(tasksToInsert)

              if (insertError) {
                console.error('Error creating new task instances:', insertError)
                throw insertError
              }
              console.log(`✅ Created ${tasksToInsert.length} new task instances`)
            }
          }
        } else if (oldEndDate && !newEndDate) {
          // End date was removed - no need to delete, just allow unlimited recurrence
          console.log('📅 End date removed, keeping all existing tasks')
        }

        console.log('✅ Recurring task settings updated')
        
        // Reload tasks to show new instances
        setRefreshTrigger(prev => prev + 1)
      } else {
        // Task is not recurring yet - create recurring task
        console.log('🔄 Creating recurring task from existing task')
        
        // Import the utility function
        const { generateRecurringTaskInstances } = await import('@/utils/recurringUtils')
        
        // Get task date
        const taskDate = task.date ? new Date(task.date) : new Date()
        console.log('📅 Task date:', taskDate, 'Task date string:', task.date)
        
        // Generate instances
        const instances = generateRecurringTaskInstances(taskDate, settings)
        console.log('📊 Generated instances:', instances.length, instances)
        
        // Create recurring_tasks record
        const { data: recurringTaskData, error: recurringError } = await supabase
          .from('recurring_tasks')
          .insert({
            user_id: uid,
            title: task.title,
            description: task.description || '',
            priority: task.priority || 'normal',
            tag: task.tag || '',
            todos: task.todos || [],
            project_id: task.project_id,
            recurrence_type: settings.recurrenceType,
            recurrence_interval: settings.interval || settings.recurrenceInterval || 1,
            recurrence_day_of_week: settings.dayOfWeek || settings.recurrenceDayOfWeek,
            recurrence_day_of_month: settings.dayOfMonth || settings.recurrenceDayOfMonth,
            start_date: taskDate.toISOString().split('T')[0],
            end_date: typeof settings.endDate === 'string' ? settings.endDate : settings.endDate?.toISOString().split('T')[0],
            is_active: true
          })
          .select()
          .single()

        if (recurringError) {
          console.error('❌ Error creating recurring task:', recurringError)
          throw recurringError
        }

        const recurringTaskId = recurringTaskData.id
        console.log('✅ Created recurring_task record:', recurringTaskId)

        // Update current task with recurring_task_id
        await supabase
          .from('tasks_items')
          .update({ recurring_task_id: recurringTaskId })
          .eq('id', task.id)

        // Create task instances
        console.log('🔍 Filtering instances. Original task date:', task.date)
        const tasksToCreate = instances
          .filter(inst => {
            console.log('  Checking instance:', inst.date, 'vs', task.date, '=', inst.date !== task.date)
            return inst.date !== task.date
          })
          .map(inst => ({
            user_id: uid,
            project_id: task.project_id,
            title: task.title,
            description: task.description || '',
            priority: task.priority || 'normal',
            tag: task.tag || '',
            date: inst.date,
            position: 0,
            todos: task.todos || [],
            status: 'open',
            recurring_task_id: recurringTaskId
          }))

        console.log('📝 Tasks to create:', tasksToCreate.length, tasksToCreate)

        if (tasksToCreate.length > 0) {
          const { data: insertedData, error: insertError } = await supabase
            .from('tasks_items')
            .insert(tasksToCreate)
            .select()

          if (insertError) {
            console.error('❌ Error creating task instances:', insertError)
            throw insertError
          }
          
          console.log('✅ Inserted tasks:', insertedData)
        } else {
          console.log('⚠️ No new tasks to create (all filtered out)')
        }

        console.log(`✅ Created ${tasksToCreate.length} recurring task instances`)
        
        // Reload tasks to show new instances
        setRefreshTrigger(prev => prev + 1)
      }

      if (import.meta.env.DEV) console.log('✅ Recurring task settings updated')
    } catch (error) {
      console.error('❌ Error updating recurring task settings:', error)
      throw error
    }
  }

  // Function to update all recurring tasks and create missing instances
  const updateAllRecurringTasks = async () => {
    if (!uid) return

    console.log('🔄 Updating all recurring tasks...')

    try {
      // Get all active recurring tasks
      const { data: recurringTasks, error: fetchError } = await supabase
        .from('recurring_tasks')
        .select('*')
        .eq('user_id', uid)
        .eq('is_active', true)

      if (fetchError) {
        console.error('Error fetching recurring tasks:', fetchError)
        throw fetchError
      }

      if (!recurringTasks || recurringTasks.length === 0) {
        console.log('ℹ️ No active recurring tasks found')
        return
      }

      console.log(`📋 Found ${recurringTasks.length} active recurring tasks`)

      const { generateTaskInstances } = await import('@/utils/recurringUtils')
      let totalCreated = 0

      for (const recurringTask of recurringTasks) {
        try {
          // Determine start date: always start from recurring task start_date
          // This ensures we generate ALL instances, not just ones after the last created task
          // CRITICAL: Parse date in local timezone to avoid UTC shift
          const startDateStr = recurringTask.start_date
          const [year, month, day] = startDateStr.split('-').map(Number)
          const startDate = new Date(year, month - 1, day) // month is 0-indexed
          startDate.setHours(0, 0, 0, 0) // Normalize to start of day
          
          console.log(`📅 Parsed start_date: "${startDateStr}" -> ${format(startDate, 'yyyy-MM-dd')} (day=${startDate.getDate()})`)

          // Determine end date: use end_date if set, otherwise generate for next 6 months
          const taskEndDate = recurringTask.end_date ? new Date(recurringTask.end_date) : null
          const endDate = taskEndDate || (() => {
            const future = new Date()
            future.setMonth(future.getMonth() + 6)
            future.setHours(23, 59, 59, 999) // End of day
            return future
          })()

          // Don't generate if start date is after end date
          if (startDate > endDate) {
            console.log(`⏭️ Skipping ${recurringTask.title}: start date after end date`)
            continue
          }

          console.log(`🔄 Generating tasks for "${recurringTask.title}" from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

          // Generate ALL instances from start_date to end_date
          const instances = generateTaskInstances(recurringTask, startDate, endDate)
          
          console.log(`📅 Generated ${instances.length} instances for "${recurringTask.title}"`)

          if (instances.length === 0) {
            console.log(`ℹ️ No new instances for ${recurringTask.title}`)
            continue
          }

          // Check which tasks already exist - check by both date AND recurring_task_id
          const instanceDates = instances.map(inst => inst.date)
          
          if (instanceDates.length === 0) {
            console.log(`ℹ️ No dates to check for ${recurringTask.title}`)
            continue
          }
          
          const { data: existingTasks, error: checkError } = await supabase
            .from('tasks_items')
            .select('id, date, recurring_task_id')
            .eq('recurring_task_id', recurringTask.id)
            .in('date', instanceDates)

          if (checkError) {
            console.error(`Error checking existing tasks for ${recurringTask.title}:`, checkError)
            continue
          }

          // Create a set of existing date+recurring_task_id combinations
          const existingKeys = new Set(
            existingTasks?.map(t => `${t.date}_${t.recurring_task_id}`) || []
          )
          
          console.log(`🔍 For "${recurringTask.title}": checking ${instanceDates.length} dates, found ${existingKeys.size} existing tasks`)
          
          const tasksToCreate = instances
            .filter(inst => {
              const key = `${inst.date}_${recurringTask.id}`
              const exists = existingKeys.has(key)
              if (exists) {
                console.log(`⏭️ Skipping duplicate: ${inst.date} for recurring_task_id ${recurringTask.id}`)
              }
              return !exists
            })
            .map(inst => ({
              user_id: uid,
              project_id: recurringTask.project_id,
              title: recurringTask.title,
              description: recurringTask.description || '',
              priority: recurringTask.priority || 'normal',
              tag: recurringTask.tag || '',
              date: inst.date,
              position: 0,
              todos: recurringTask.todos || [],
              status: 'open',
              recurring_task_id: recurringTask.id
            }))

          if (tasksToCreate.length > 0) {
            // Get positions for each date
            const datePositions = new Map<string, number>()
            for (const task of tasksToCreate) {
              const { data: lastTaskForDate } = await supabase
                .from('tasks_items')
                .select('position')
                .eq('date', task.date)
                .order('position', { ascending: false })
                .limit(1)
                .single()

              const currentMax = datePositions.get(task.date) || (lastTaskForDate?.position || 0)
              datePositions.set(task.date, currentMax + 1)
              task.position = currentMax
            }

            const { error: insertError } = await supabase
              .from('tasks_items')
              .insert(tasksToCreate)

            if (insertError) {
              console.error(`Error creating tasks for ${recurringTask.title}:`, insertError)
              continue
            }

            console.log(`✅ Created ${tasksToCreate.length} tasks for "${recurringTask.title}"`)
            totalCreated += tasksToCreate.length
          } else {
            console.log(`ℹ️ All instances already exist for "${recurringTask.title}"`)
          }
        } catch (error) {
          console.error(`Error processing recurring task ${recurringTask.id}:`, error)
          continue
        }
      }

      console.log(`✅ Total: Created ${totalCreated} new task instances`)

      // Remove duplicates if any were created
      await removeDuplicateRecurringTasks()

      // Reload tasks to show new instances
      setRefreshTrigger(prev => prev + 1)

      return totalCreated
    } catch (error) {
      console.error('❌ Error updating recurring tasks:', error)
      throw error
    }
  }

  // Force regenerate all recurring tasks (useful for debugging or fixing missing tasks)
  const forceRegenerateAllRecurringTasks = async () => {
    if (!uid) return

    console.log('🔄 Force regenerating all recurring tasks...')

    try {
      // Get all active recurring tasks
      const { data: recurringTasks, error: fetchError } = await supabase
        .from('recurring_tasks')
        .select('*')
        .eq('user_id', uid)
        .eq('is_active', true)

      if (fetchError) {
        console.error('Error fetching recurring tasks:', fetchError)
        throw fetchError
      }

      if (!recurringTasks || recurringTasks.length === 0) {
        console.log('ℹ️ No active recurring tasks found')
        return
      }

      console.log(`📋 Found ${recurringTasks.length} active recurring tasks`)

      const { generateTaskInstances } = await import('@/utils/recurringUtils')
      let totalCreated = 0

      for (const recurringTask of recurringTasks) {
        try {
          // Always start from recurring task start_date
          const startDate = new Date(recurringTask.start_date)
          startDate.setHours(0, 0, 0, 0)

          // Determine end date: use end_date if set, otherwise generate for next 6 months
          const taskEndDate = recurringTask.end_date ? new Date(recurringTask.end_date) : null
          const endDate = taskEndDate || (() => {
            const future = new Date()
            future.setMonth(future.getMonth() + 6)
            future.setHours(23, 59, 59, 999)
            return future
          })()

          if (startDate > endDate) {
            console.log(`⏭️ Skipping ${recurringTask.title}: start date after end date`)
            continue
          }

          console.log(`🔄 Generating ALL tasks for "${recurringTask.title}" from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

          // Generate ALL instances
          const instances = generateTaskInstances(recurringTask, startDate, endDate)
          
          console.log(`📅 Generated ${instances.length} instances for "${recurringTask.title}"`)

          if (instances.length === 0) {
            console.log(`ℹ️ No instances for ${recurringTask.title}`)
            continue
          }

          // Check which tasks already exist
          const instanceDates = instances.map(inst => inst.date)
          
          if (instanceDates.length === 0) {
            console.log(`ℹ️ No dates to check for ${recurringTask.title}`)
            continue
          }
          
          const { data: existingTasks, error: checkError } = await supabase
            .from('tasks_items')
            .select('id, date, recurring_task_id')
            .eq('recurring_task_id', recurringTask.id)
            .in('date', instanceDates)

          if (checkError) {
            console.error(`Error checking existing tasks for ${recurringTask.title}:`, checkError)
            continue
          }

          // Create a set of existing date+recurring_task_id combinations
          const existingKeys = new Set(
            existingTasks?.map(t => `${t.date}_${t.recurring_task_id}`) || []
          )
          
          console.log(`🔍 For "${recurringTask.title}": checking ${instanceDates.length} dates, found ${existingKeys.size} existing tasks`)
          
          const tasksToCreate = instances
            .filter(inst => {
              const key = `${inst.date}_${recurringTask.id}`
              const exists = existingKeys.has(key)
              if (exists) {
                console.log(`⏭️ Skipping duplicate: ${inst.date} for recurring_task_id ${recurringTask.id}`)
              }
              return !exists
            })
            .map(inst => ({
              user_id: uid,
              project_id: recurringTask.project_id,
              title: recurringTask.title,
              description: recurringTask.description || '',
              priority: recurringTask.priority || 'normal',
              tag: recurringTask.tag || '',
              date: inst.date,
              position: 0,
              todos: recurringTask.todos || [],
              status: 'open',
              recurring_task_id: recurringTask.id
            }))

          if (tasksToCreate.length > 0) {
            // Get positions for each date
            const datePositions = new Map<string, number>()
            for (const task of tasksToCreate) {
              const { data: lastTaskForDate } = await supabase
                .from('tasks_items')
                .select('position')
                .eq('date', task.date)
                .order('position', { ascending: false })
                .limit(1)
                .single()

              const currentMax = datePositions.get(task.date) || (lastTaskForDate?.position || 0)
              datePositions.set(task.date, currentMax + 1)
              task.position = currentMax
            }

            const { error: insertError } = await supabase
              .from('tasks_items')
              .insert(tasksToCreate)

            if (insertError) {
              console.error(`Error creating tasks for ${recurringTask.title}:`, insertError)
              continue
            }

            console.log(`✅ Created ${tasksToCreate.length} tasks for "${recurringTask.title}"`)
            totalCreated += tasksToCreate.length
          } else {
            console.log(`ℹ️ All instances already exist for "${recurringTask.title}"`)
          }
        } catch (error) {
          console.error(`Error processing recurring task ${recurringTask.id}:`, error)
          continue
        }
      }

      console.log(`✅ Total: Created ${totalCreated} new task instances`)

      // Remove duplicates if any were created
      await removeDuplicateRecurringTasks()

      // Reload tasks to show new instances
      setRefreshTrigger(prev => prev + 1)

      return totalCreated
    } catch (error) {
      console.error('❌ Error updating recurring tasks:', error)
      throw error
    }
  }

  // Function to find and remove duplicate recurring tasks on adjacent dates
  // This helps fix cases where tasks were created on wrong dates (e.g., 8 and 9 instead of just 9)
  const findAndRemoveDuplicateRecurringTasks = async () => {
    if (!uid) return

    try {
      console.log('🔍 Searching for duplicate recurring tasks on adjacent dates...')

      // Get all tasks with recurring_task_id
      const { data: allRecurringTasks, error: fetchError } = await supabase
        .from('tasks_items')
        .select('id, date, recurring_task_id, created_at, title')
        .eq('user_id', uid)
        .not('recurring_task_id', 'is', null)
        .order('recurring_task_id', { ascending: true })
        .order('date', { ascending: true })

      if (fetchError) {
        console.error('Error fetching recurring tasks:', fetchError)
        return
      }

      if (!allRecurringTasks || allRecurringTasks.length === 0) {
        console.log('ℹ️ No recurring tasks found')
        return
      }

      // Group by recurring_task_id
      const groupedByRecurringId = new Map<string, typeof allRecurringTasks>()
      for (const task of allRecurringTasks) {
        if (!task.recurring_task_id) continue
        if (!groupedByRecurringId.has(task.recurring_task_id)) {
          groupedByRecurringId.set(task.recurring_task_id, [])
        }
        groupedByRecurringId.get(task.recurring_task_id)!.push(task)
      }

      const duplicatesToDelete: string[] = []

      // Check each recurring task group for adjacent dates
      for (const [recurringTaskId, tasks] of groupedByRecurringId.entries()) {
        if (tasks.length < 2) continue

        // Sort by date
        tasks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        // Check for adjacent dates (same day or next day)
        for (let i = 0; i < tasks.length - 1; i++) {
          const task1 = tasks[i]
          const task2 = tasks[i + 1]
          
          const date1 = new Date(task1.date)
          const date2 = new Date(task2.date)
          const daysDiff = Math.abs((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24))

          // If tasks are on adjacent dates (0 or 1 day apart), mark one for deletion
          if (daysDiff <= 1) {
            // Keep the one created later (it's likely the correct one after fix)
            // Or keep the one with the date that matches the pattern better
            const taskToDelete = date1 > date2 ? task2 : task1
            duplicatesToDelete.push(taskToDelete.id)
            console.log(`🔍 Found duplicate: ${task1.title} on ${task1.date} and ${task2.date}, will delete ${taskToDelete.date}`)
          }
        }
      }

      if (duplicatesToDelete.length > 0) {
        console.log(`🗑️ Deleting ${duplicatesToDelete.length} duplicate tasks...`)
        
        // Delete in batches
        const batchSize = 100
        for (let i = 0; i < duplicatesToDelete.length; i += batchSize) {
          const batch = duplicatesToDelete.slice(i, i + batchSize)
          const { error: deleteError } = await supabase
            .from('tasks_items')
            .delete()
            .in('id', batch)

          if (deleteError) {
            console.error('Error deleting duplicates:', deleteError)
            continue
          }
        }

        console.log(`✅ Deleted ${duplicatesToDelete.length} duplicate tasks`)
        // Reload tasks after deleting duplicates
        setRefreshTrigger(prev => prev + 1)
      } else {
        console.log('✅ No duplicates found on adjacent dates')
      }
    } catch (error) {
      console.error('❌ Error removing duplicates:', error)
    }
  }

  // Function to remove duplicate recurring tasks (keep only the first one for each date+recurring_task_id)
  const removeDuplicateRecurringTasks = async () => {
    if (!uid) return

    try {
      console.log('🔍 Checking for duplicate recurring tasks...')

      // Get all tasks with recurring_task_id
      const { data: allRecurringTasks, error: fetchError } = await supabase
        .from('tasks_items')
        .select('id, date, recurring_task_id, created_at')
        .eq('user_id', uid)
        .not('recurring_task_id', 'is', null)

      if (fetchError) {
        console.error('Error fetching recurring tasks:', fetchError)
        return
      }

      if (!allRecurringTasks || allRecurringTasks.length === 0) {
        console.log('ℹ️ No recurring tasks found')
        return
      }

      // Group by date + recurring_task_id
      const grouped = new Map<string, Array<{ id: string; created_at: string }>>()
      
      for (const task of allRecurringTasks) {
        const key = `${task.date}_${task.recurring_task_id}`
        if (!grouped.has(key)) {
          grouped.set(key, [])
        }
        grouped.get(key)!.push({ id: task.id, created_at: task.created_at || '' })
      }

      // Find duplicates (more than 1 task for same date+recurring_task_id)
      const duplicatesToDelete: string[] = []
      
      for (const [key, tasks] of grouped.entries()) {
        if (tasks.length > 1) {
          // Sort by created_at (oldest first) and keep the first one
          const sorted = tasks.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          
          // Mark all except the first one for deletion
          for (let i = 1; i < sorted.length; i++) {
            duplicatesToDelete.push(sorted[i].id)
          }
          
          console.log(`🔍 Found ${tasks.length} duplicates for ${key}, will delete ${sorted.length - 1}`)
        }
      }

      if (duplicatesToDelete.length > 0) {
        console.log(`🗑️ Deleting ${duplicatesToDelete.length} duplicate tasks...`)
        
        // Delete in batches to avoid query size limits
        const batchSize = 100
        for (let i = 0; i < duplicatesToDelete.length; i += batchSize) {
          const batch = duplicatesToDelete.slice(i, i + batchSize)
          const { error: deleteError } = await supabase
            .from('tasks_items')
            .delete()
            .in('id', batch)

          if (deleteError) {
            console.error('Error deleting duplicates:', deleteError)
            continue
          }
        }

        console.log(`✅ Deleted ${duplicatesToDelete.length} duplicate tasks`)
        // Reload tasks after deleting duplicates
        setRefreshTrigger(prev => prev + 1)
      } else {
        console.log('✅ No duplicates found')
      }
    } catch (error) {
      console.error('❌ Error removing duplicates:', error)
    }
  }

  // Handle subtask updates - sync checkbox with status
  const handleSubtaskUpdate = async (updatedSubtask: any | null, isSave?: boolean) => {
    if (!updatedSubtask) return
    
    // CRITICAL: Force immediate update by using setTasks with functional update
    // This ensures React sees the change and re-renders immediately
    setTasks(prevTasks => {
      const subtaskDate = updatedSubtask.date || null
      const dateWasRemoved = !subtaskDate || subtaskDate === '' || subtaskDate === null || subtaskDate === undefined
      
      // Create a deep copy of tasks - CRITICAL for React to see the change
      const newMap: Record<string, TaskItem[]> = {}
      Object.keys(prevTasks).forEach(key => {
        newMap[key] = [...prevTasks[key]]
      })
      
      // FIRST: Always check if subtask exists on ANY date and update it (for status/date changes)
      let foundOnAnyDate = false
      
      Object.keys(newMap).forEach(dayKey => {
        const originalArray = newMap[dayKey]
        const updatedArray = originalArray.map(t => {
          if (t.id === updatedSubtask.id) {
            foundOnAnyDate = true
            // Always create a completely new object to ensure React sees the change
            return { ...updatedSubtask } as TaskItem
          }
          return t
        })
        // Only update if array actually changed (found the subtask)
        if (foundOnAnyDate && updatedArray !== originalArray) {
          newMap[dayKey] = updatedArray
        }
      })
      
      if (dateWasRemoved) {
        // Remove from ALL dates if date was removed
        Object.keys(newMap).forEach(dayKey => {
          newMap[dayKey] = newMap[dayKey].filter(t => t.id !== updatedSubtask.id)
          if (newMap[dayKey].length === 0) {
            delete newMap[dayKey]
          }
        })
        return newMap
      } else {
        // Date was set - ensure subtask is on correct date
        const targetDate = subtaskDate as string
        
        // Remove from any other dates (if not already updated above)
        if (!foundOnAnyDate) {
          Object.keys(newMap).forEach(dayKey => {
            if (dayKey !== targetDate) {
              newMap[dayKey] = newMap[dayKey].filter(t => t.id !== updatedSubtask.id)
              if (newMap[dayKey].length === 0) {
                delete newMap[dayKey]
              }
            }
          })
        }
        
        // If subtask wasn't found, add it to target date
        if (!foundOnAnyDate) {
          if (!newMap[targetDate]) {
            newMap[targetDate] = []
          }
          newMap[targetDate] = [...newMap[targetDate], { ...updatedSubtask } as TaskItem]
        }
        
        // CRITICAL: Always return new map to trigger React re-render
        // We always create a new map and modify arrays, so React will see the change
        return newMap
      }
    })
    
    // Sync with parent task if needed (async, don't block board update)
    if (updatedSubtask?.parent_task_id && viewTask?.id === updatedSubtask.parent_task_id && viewTask) {
      // Check if we need to sync by comparing current checkbox state with subtask status
      const currentTodo = viewTask.todos?.find((todo: Todo) => todo.taskId === updatedSubtask.id)
      if (currentTodo) {
        const shouldBeDone = updatedSubtask.status === 'closed'
        if (currentTodo.done !== shouldBeDone) {
          // Reload parent task from database
          const { data: parentTask, error } = await supabase
            .from('tasks_items')
            .select('*')
            .eq('id', updatedSubtask.parent_task_id)
            .single()
          
          if (!error && parentTask?.todos) {
            // Update the corresponding todo item's done status based on subtask status
            const updatedTodos = parentTask.todos.map((todo: Todo) => {
              if (todo.taskId === updatedSubtask.id) {
                return { ...todo, done: updatedSubtask.status === 'closed' }
              }
              return todo
            })
            
            // Check if todos actually changed
            const todosChanged = JSON.stringify(parentTask.todos) !== JSON.stringify(updatedTodos)
            
            if (todosChanged) {
              // Update parent task in database
              await supabase
                .from('tasks_items')
                .update({ todos: updatedTodos })
                .eq('id', parentTask.id)
              
              // Update viewTask with new todos
              setViewTask({ ...parentTask, todos: updatedTodos } as TaskItem)
            }
          }
        }
      }
    }
  }

  // Handle task updates - check for recurring tasks
  const handleTaskUpdate = async (updatedTask: any | null, isSave?: boolean) => {
    if (false) {
      console.log('🔄 handleTaskUpdate called:', { 
        updatedTask: updatedTask?.title, 
        updatedTaskDate: updatedTask?.date,
        isSave, 
        viewTask: viewTask?.title,
        viewTaskDate: viewTask?.date,
        viewTaskRecurringId: viewTask?.recurring_task_id
      })
    }
    
    // Handle task deletion (updatedTask is null)
    if (!updatedTask) {
      setViewTask(null)
      return
    }
    
    // CRITICAL: If this is a subtask update (has parent_task_id), route to handleSubtaskUpdate
    // This ensures all subtask changes (status, date, etc.) immediately update the board
    const parentTaskId = (updatedTask as any)?.parent_task_id
    if (parentTaskId) {
      // Immediately update the board
      handleSubtaskUpdate(updatedTask, isSave)
      // Also update viewTask if it's the current subtask being viewed
      if (viewTask && viewTask.id === updatedTask.id) {
        setViewTask(updatedTask as TaskItem)
      }
      return
    }
    
    if (!viewTask) return
    
    // Check if there were actual changes (exclude date changes for recurring tasks)
    const hasChanges = (
      updatedTask.title !== viewTask.title ||
      updatedTask.description !== viewTask.description ||
      updatedTask.priority !== viewTask.priority ||
      updatedTask.tag !== viewTask.tag ||
      updatedTask.project_id !== viewTask.project_id ||
      JSON.stringify(updatedTask.todos) !== JSON.stringify(viewTask.todos)
    )
    
    // For recurring tasks, date changes should not trigger the modal
    const hasRelevantChanges = viewTask.recurring_task_id 
      ? hasChanges 
      : hasChanges || (updatedTask.date !== viewTask.date)
    
    if (false) {
      // Debug logging disabled
      console.log('🔍 Changes detected:', {
        hasChanges,
        hasRelevantChanges,
        titleChanged: updatedTask.title !== viewTask?.title,
        descriptionChanged: updatedTask.description !== viewTask?.description,
        priorityChanged: updatedTask.priority !== viewTask?.priority,
        tagChanged: updatedTask.tag !== viewTask?.tag,
        dateChanged: updatedTask.date !== viewTask?.date,
        projectChanged: updatedTask.project_id !== viewTask?.project_id,
        todosChanged: JSON.stringify(updatedTask.todos) !== JSON.stringify(viewTask?.todos)
      })
    }
    
    // Only check for recurring tasks when it's actually a manual save operation AND there are relevant changes
    if (isSave && viewTask.recurring_task_id && hasRelevantChanges) {
      
      try {
        // Check database directly for all tasks with this recurring_task_id
        const { data: dbRecurringTasks, error } = await supabase
          .from('tasks_items')
          .select('id, title')
          .eq('recurring_task_id', viewTask.recurring_task_id)
        
        if (error) throw error
        
        if (dbRecurringTasks && dbRecurringTasks.length > 1) {
          // Show recurring edit modal
          setTaskToEdit({ task: viewTask, updates: updatedTask })
          setShowRecurringEdit(true)
          return
        }
      } catch (error) {
        console.error('❌ Error checking recurring tasks:', error)
        // Fallback to local state check
        const allTasks = Object.values(tasks).flat()
        const recurringTasks = allTasks.filter(t => t.recurring_task_id === viewTask.recurring_task_id)
        
        if (recurringTasks.length > 1) {
          setTaskToEdit({ task: viewTask, updates: updatedTask })
          setShowRecurringEdit(true)
          return
        }
      }
    }
    
    // Single task or only one instance of recurring task - update directly
    updateTaskDirectly(updatedTask, isSave)
  }

  const updateTaskDirectly = (updatedTask: TaskItem, shouldCloseModal: boolean = true) => {
    const map = { ...tasks }
    const oldDate = viewTask?.date || ""
    const newDate = updatedTask.date || ""
    
    // Find the project name for the updated project_id
    const projectName = updatedTask.project_id 
      ? projects.find(p => p.id === updatedTask.project_id)?.name || null
      : null
    
    // Create updated task with correct project_name
    const taskWithProjectName = {
      ...updatedTask,
      project_name: projectName
    }
    
    // Find original position of the task
    let originalPosition = -1
    if (oldDate && map[oldDate]) {
      const originalIndex = map[oldDate].findIndex(x => x.id === updatedTask.id)
      if (originalIndex >= 0) {
        originalPosition = map[oldDate][originalIndex].position || originalIndex
      }
    }
    
    // Remove from old date if it exists
    if (oldDate && map[oldDate]) {
      map[oldDate] = map[oldDate].filter(x => x.id !== updatedTask.id)
      if (map[oldDate].length === 0) {
        delete map[oldDate]
      }
    }
    
    // Add to new date (but not for subtasks - they should not appear on board)
    if (newDate && !updatedTask.parent_task_id) {
      if (!map[newDate]) {
        map[newDate] = []
      }
      
      // Always remove the task from new date first to prevent duplicates
      map[newDate] = map[newDate].filter(x => x.id !== updatedTask.id)
      
      // If date changed, append to end; otherwise maintain position
      if (oldDate !== newDate) {
        map[newDate].push({ ...taskWithProjectName, position: map[newDate].length })
      } else {
        // Same date - try to maintain position
        const insertPosition = Math.max(0, Math.min(originalPosition, map[newDate].length))
        map[newDate].splice(insertPosition, 0, { ...taskWithProjectName, position: insertPosition })
        
        // Recalculate positions
        map[newDate] = map[newDate].map((task, index) => ({ ...task, position: index }))
      }
    }
    
    setTasks(map)
    
    // Only close modal for manual saves, not auto-saves
    if (shouldCloseModal) {
      setViewTask(null)
    }
  }

  // Get tasks for mobile date
  const mobileTasks = React.useMemo(() => {
    const dayKey = format(mobileDate, 'yyyy-MM-dd')
    return tasks[dayKey] || []
  }, [tasks, mobileDate])

  // Mobile view
  if (isMobile) {
    return <TasksMobile />
  }

  // Desktop view - original week grid layout
  return (
    <div className={`tasks-page ${projectsCollapsed ? 'is-collapsed' : ''}`}>
      {/* Left area: projects panel */}
      <ProjectSidebar 
        userId={uid!} 
        activeId={activeProject} 
        onChange={setActiveProject}
        collapsed={projectsCollapsed}
        onToggleCollapse={() => {
          const newState = !projectsCollapsed
          setProjectsCollapsed(newState)
          localStorage.setItem('frovo_projects_collapsed', String(newState))
        }}
      />
      

      {/* Right area: content */}
      <section className="tasks-board">
        {/* View content */}
        {viewMode === 'weekly' && (
          <div className="week-grid">
            <div className="week-head">
              <WeekTimeline
                anchor={start}
                onPrev={()=>setStart(prev=>subWeeks(prev,1))}
                onNext={()=>setStart(prev=>addWeeks(prev,1))}
              />
            </div>

          {days.map((d, dayIndex) => {
            const key = format(d, 'yyyy-MM-dd')
            return (
              <div 
                key={key}
                data-day-key={key}
                className={`day-col ${([0,6].includes(new Date(d).getDay()) ? "is-weekend" : "")} ${key===todayKey ? "is-today" : ""}`}
              >
                <div className="day-head">
                  <span>{format(d,'EEE, d MMM')}</span>
                  <button
                    className="btn btn-outline btn-xs add-on-hover flex items-center gap-1"
                    onClick={()=>{ 
                      console.log('📅 Button clicked, day:', d, 'formatted:', format(d, 'yyyy-MM-dd'))
                      setTaskDate(new Date(d)) // Ensure it's a proper Date object
                      setOpenNewTask(true) 
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    {t('tasks.task')}
                  </button>
                </div>
                <div className="day-body">
                  
                  {(tasks[key] || []).map((taskItem, index) => {
                    const isDragged = isDragging && draggedTask?.id === taskItem.id
                    const isDropTarget = dropTarget?.dayKey === key && dropTarget?.index === index
                    const isGhost = isDragging && dragSource?.dayKey === key && dragSource?.index === index
                    
                    // Debug logging for drop target detection
                    if (dropTarget?.dayKey === key) {
                      logger.debug(`🔍 Card ${index}: dropTarget.index=${dropTarget?.index}, index=${index}, isDropTarget=${isDropTarget}`)
                    }
                    
                    return (
                      <React.Fragment key={taskItem.id}>
                        {/* Drop indicator */}
                        {isDropTarget && (
                          <div className="drop-indicator" style={{
                            height: '2px',
                            margin: '4px 0',
                            borderTop: '2px dashed #000000',
                            borderRadius: '1px'
                          }} />
                        )}
                        
                        {/* Original task card */}
                        <div
                          className={`task-card group transition-all duration-150 hover:border-black ${taskItem.status === TASK_STATUSES.CLOSED ? 'is-closed' : ''} ${isDragged ? 'is-dragging' : ''} ${isGhost ? 'opacity-30' : ''}`}
                          style={{
                            backgroundColor: taskItem.status === TASK_STATUSES.CLOSED ? '#F2F7FA' : '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            overflow: 'visible', // Allow tooltip to show outside card bounds
                            ...(isDragged ? {
                              position: 'fixed',
                              left: dragPosition.x - 10, // Small offset from cursor
                              top: dragPosition.y - 10,  // Small offset from cursor
                              zIndex: 10001,
                              pointerEvents: 'none',
                              transform: 'none',
                              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                              opacity: 0.8, // Transparency
                              // Keep exact original width and text formatting
                              width: draggedCardWidth ? `${draggedCardWidth}px` : 'auto',
                              minWidth: draggedCardWidth ? `${draggedCardWidth}px` : '280px',
                              maxWidth: draggedCardWidth ? `${draggedCardWidth}px` : 'none',
                              whiteSpace: 'normal', // Allow text wrapping
                              wordWrap: 'break-word', // Break long words
                            } : {})
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const menuWidth = 160
                            const menuHeight = 120
                            const { x, y } = clampToViewport(
                              e.clientX + 10, // Right of cursor
                              e.clientY - 10, // Above cursor
                              menuWidth,
                              menuHeight
                            );
                            setCtx({
                              open: true,
                              x: e.clientX + 10, // Right of cursor
                              y: e.clientY - 10, // Above cursor
                              task: taskItem,
                              dayKey: key,
                            });
                          }}
                          onMouseDown={(e) => {
                            // Only prevent right click
                            if (e.button === 2) {
                              e.preventDefault();
                              e.stopPropagation();
                              return;
                            }
                            // Start tracking for potential drag
                            handleMouseDown(e, taskItem, key, index)
                          }}
                          onClick={(e) => {
                            logger.debug('🖱️ Click on task', { hasMovedRef: hasMovedRef.current, isDraggingRef: isDraggingRef.current })
                            
                            // Only open task modal if we haven't moved the mouse (not dragging)
                            // Use ref to check current state immediately
                            if (hasMovedRef.current || isDraggingRef.current) {
                              logger.debug('❌ Not opening - was dragging')
                              return
                            }
                            
                            // Prevent double clicks - ignore if clicked within 500ms on the same task
                            const now = Date.now()
                            const timeSinceLastClick = now - lastClickTimeRef.current
                            const isDoubleClick = timeSinceLastClick < 500 && lastClickedTaskIdRef.current === taskItem.id
                            
                            // Also check if modal is already open for this exact task
                            const isAlreadyOpen = viewTask?.id === taskItem.id
                            
                            // Check if modal is currently opening
                            const isOpening = isOpeningModalRef.current
                            
                            if (isDoubleClick || isAlreadyOpen || isOpening) {
                              logger.debug('❌ Ignoring click - double click, already open, or opening', { isDoubleClick, isAlreadyOpen, isOpening, timeSinceLastClick })
                              e.preventDefault()
                              e.stopPropagation()
                              return
                            }
                            
                            // Open task modal
                            logger.debug('✅ Opening task modal immediately')
                            lastClickTimeRef.current = now
                            lastClickedTaskIdRef.current = taskItem.id
                            isOpeningModalRef.current = true
                            
                            // Set a timeout to allow modal to open and prevent rapid re-clicks
                            setTimeout(() => {
                              isOpeningModalRef.current = false
                            }, 500)
                            
                            setViewTask(taskItem)
                          }}
                        >
                          {/* Menu button */}
                          <button
                            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const menuWidth = 160
                              const menuHeight = 120
                              const { x, y } = clampToViewport(
                                e.clientX + 10, // Right of cursor
                                e.clientY - 10, // Above cursor
                                menuWidth,
                                menuHeight
                              );
                              setCtx({
                                open: true,
                                x: e.clientX + 10, // Right of cursor
                                y: e.clientY - 10, // Above cursor
                                task: taskItem,
                                dayKey: key,
                              });
                            }}
                          >
                            <div className="w-4 h-4 flex items-center justify-center">
                              <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </div>
                          </button>

                          <div className="text-sm">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              {taskItem.priority && getPriorityText(taskItem.priority) ? (
                                <span 
                                  className={`text-xs font-medium px-2 py-1 rounded-full ${taskItem.status === TASK_STATUSES.CLOSED ? 'opacity-30' : ''}`}
                                  style={{
                                    backgroundColor: getPriorityColor(taskItem.priority).background,
                                    color: getPriorityColor(taskItem.priority).text,
                                    borderRadius: '999px'
                                  }}
                                >
                                  {getPriorityText(taskItem.priority)}
                                </span>
                              ) : (
                                <div></div>
                              )}
                              {taskItem.tag && (
                                <span 
                                  className={`text-xs font-medium px-2 py-1 rounded-full ${taskItem.status === TASK_STATUSES.CLOSED ? 'opacity-30' : ''}`}
                                  style={{
                                    backgroundColor: '#f3f4f6',
                                    color: '#6b7280',
                                    borderRadius: '999px'
                                  }}
                                >
                                  {taskItem.tag}
                                </span>
                              )}
                            </div>
                              <div className="leading-tight clamp-2 break-words mb-2">
                                <span 
                                  className="font-medium text-black text-sm"
                                >
                                  {taskItem.title}
                                </span>
                              </div>
                              
                              {/* Progress bar for subtasks */}
                              {(() => {
                                const total = Array.isArray(taskItem.todos) ? taskItem.todos.length : 0;
                                const done = Array.isArray(taskItem.todos) ? taskItem.todos.filter((x: Todo) => x.done).length : 0;
                                if (total === 0) return null;
                                return (
                                  <div className="space-y-1 mt-2">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                      <span>{t('tasks.progress')}</span>
                                      <span>{done}/{total}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                      <div 
                                        className="bg-black h-1.5 rounded-full transition-all duration-200"
                                        style={{ 
                                          width: `${(done / total) * 100}%`,
                                          opacity: done === total ? 0.3 : 1
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Separator line - full width */}
                              <div className="border-t border-gray-100 mt-2"></div>
                              
                              {/* Project name and recurring icon */}
                              <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                                <span>{taskItem.project_name || t('tasks.noProject')}</span>
                                {taskItem.recurring_task_id && (
                                  <div className="transition-colors hover:text-black">
                                    <Repeat className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        
                        {/* Old card completely removed - only new one used */}
                      </React.Fragment>
                    )
                  })}
                  
                  {/* Drop indicator at the very end of the column */}
                  {dropTarget?.dayKey === key && dropTarget?.index === (tasks[key]?.length || 0) && (
                    <div className="drop-indicator" style={{
                      height: '2px',
                      margin: '4px 0',
                      borderTop: '2px dashed #000000',
                      borderRadius: '1px'
                    }} />
                  )}
                </div>
              </div>
            )
          })}
          </div>
        )}

        {viewMode === 'list' && (
          <TasksListView 
            tasks={tasks}
            start={start}
            onTaskClick={(task) => setViewTask(task)}
            onTaskUpdate={handleTaskUpdate}
            t={t}
          />
        )}

        {viewMode === 'gantt' && (
          <TasksGanttView 
            tasks={tasks}
            start={start}
            onTaskClick={(task) => setViewTask(task)}
            onTaskUpdate={handleTaskUpdate}
            t={t}
          />
        )}
      </section>

      {/* Modal: new project */}
      <TaskAddModal 
        open={openNewTask} 
        projects={projects} 
        activeProject={activeProject} 
        onClose={()=>setOpenNewTask(false)} 
        dateLabel={taskDate ? format(taskDate, "d MMMM, EEEE") : ""} 
        initialDate={taskDate || new Date()}
        onSubmit={async (title, desc, prio, tag, todos, projId, date, recurringSettings)=>{ await createTask(title, desc, prio, tag, todos, projId, date, recurringSettings) }} 
      />

      {/* Expose function to window for manual cleanup of duplicates */}
      {React.useEffect(() => {
        if (typeof window !== 'undefined') {
          (window as any).findAndRemoveDuplicateRecurringTasks = findAndRemoveDuplicateRecurringTasks
          (window as any).removeDuplicateRecurringTasks = removeDuplicateRecurringTasks
        }
        return () => {
          if (typeof window !== 'undefined') {
            delete (window as any).findAndRemoveDuplicateRecurringTasks
            delete (window as any).removeDuplicateRecurringTasks
          }
        }
      }, [])}

      {/* Main task modal - right side - always has backdrop */}
      {viewTask && (
        <ModernTaskModal
          key={`main-${viewTask.id || 'new'}`}
          open={true}
          onClose={() => {
            // Close main task (and subtask if open)
            setViewTask(null)
            setTaskStack([])
            setIsSubtaskOpen(false)
            // Reset click tracking to allow reopening the task
            lastClickedTaskIdRef.current = null
            lastClickTimeRef.current = 0
            isOpeningModalRef.current = false
            // Trigger board refresh to update subtask statuses
            setRefreshTrigger(prev => prev + 1)
          }}
          task={viewTask}
          onUpdated={handleTaskUpdate}
          onSubtaskDateChange={handleSubtaskUpdate}
          onUpdateRecurrence={updateRecurringTaskSettings}
          position="right"
          customZIndex={100}
          noBackdrop={false} // Always has backdrop
          disableBackdropClick={isSubtaskOpen} // Don't close on backdrop click when subtask is open
          splitView={isSubtaskOpen} // Enable split view when subtask is open
          onOpenTask={(task) => {
            setTaskStack(prev => [...prev, task as TaskItem])
            setIsSubtaskOpen(true)
          }}
        />
      )}
      
      {/* Subtask modal - left side without backdrop */}
      {isSubtaskOpen && taskStack.length > 0 && (
        <ModernTaskModal
          key={`subtask-${taskStack[taskStack.length - 1]?.id}`}
          open={true}
          onClose={() => {
            // Close all subtasks at once
            setTaskStack([])
            setIsSubtaskOpen(false)
          }}
          onCancel={() => {
            // Close all subtasks at once
            setTaskStack([])
            setIsSubtaskOpen(false)
          }}
          task={taskStack[taskStack.length - 1]}
          onUpdated={handleSubtaskUpdate}
          onUpdateBoard={(taskId, todos) => {
            // Direct board update for subtask todos
            console.log('📢 onUpdateBoard called for subtask:', { taskId, todosCount: todos.length })
            const map = { ...tasks }
            Object.keys(map).forEach(dayKey => {
              const dayTasks = map[dayKey] || []
              const taskIndex = dayTasks.findIndex(t => t.id === taskId)
              if (taskIndex >= 0) {
                map[dayKey] = dayTasks.map((t, idx) => 
                  idx === taskIndex ? { ...t, todos } as TaskItem : t
                )
              }
            })
            setTasks(map)
          }}
          onUpdateRecurrence={updateRecurringTaskSettings}
          position="left"
          noBackdrop={true} // No backdrop - don't block main task
          customZIndex={110}
          splitView={true} // Enable split view for subtask
          onOpenTask={(task) => {
            setTaskStack(prev => [...prev, task as TaskItem])
          }}
        />
      )}

      {ctx.open && <TaskContextMenu 
        x={ctx.x} 
        y={ctx.y} 
        task={ctx.task}
        dayKey={ctx.dayKey}
        onClose={()=>setCtx(c=>({...c, open:false}))}
        onDuplicate={()=> ctx.task && ctx.dayKey && duplicateTask(ctx.task, ctx.dayKey)}
        onToggleStatus={()=> ctx.task && ctx.dayKey && toggleTaskStatus(ctx.task, ctx.dayKey)}
        onDelete={()=> ctx.task && ctx.dayKey && deleteTask(ctx.task, ctx.dayKey)}
        t={t}
      />}


      {/* Calendar modal */}
      <TaskCalendarModal
        open={showCalendar}
        onClose={() => setShowCalendar(false)}
        tasks={allTasks}
        onDateSelect={(date) => {
          if (isMobile) {
            setMobileDate(date)
          } else {
            // Set the week containing the selected date
            setStart(startOfWeek(date, { weekStartsOn: 1 }))
          }
          setShowCalendar(false)
        }}
        onMonthChange={setCalendarMonth}
      />


      {/* Recurring delete modal */}
      <RecurringDeleteModal
        open={showRecurringDelete}
        onClose={() => {
          setShowRecurringDelete(false)
          setTaskToDelete(null)
        }}
        onDeleteSingle={() => {
          if (taskToDelete) {
            deleteSingleTask(taskToDelete.task, taskToDelete.dayKey)
          }
        }}
        onDeleteAll={() => {
          if (taskToDelete) {
            deleteAllRecurringTasks(taskToDelete.task)
          }
        }}
        taskTitle={taskToDelete?.task.title || ''}
        recurringCount={
          taskToDelete?.task.recurring_task_id 
            ? Object.values(tasks)
                .flat()
                .filter(t => t.recurring_task_id === taskToDelete.task.recurring_task_id)
                .length
            : 0
        }
      />

      {/* Recurring edit modal */}
      <RecurringEditModal
        open={showRecurringEdit}
        onClose={() => {
          setShowRecurringEdit(false)
          setTaskToEdit(null)
        }}
        onEditSingle={() => {
          if (taskToEdit) {
            editSingleTask(taskToEdit.task, taskToEdit.updates)
          }
        }}
        onEditAll={() => {
          if (taskToEdit) {
            editAllRecurringTasks(taskToEdit.task, taskToEdit.updates)
          }
        }}
        taskTitle={taskToEdit?.task.title || ''}
        recurringCount={
          taskToEdit?.task.recurring_task_id 
            ? Object.values(tasks)
                .flat()
                .filter(t => t.recurring_task_id === taskToEdit.task.recurring_task_id)
                .length
            : 0
        }
      />

    </div>
  )
}
