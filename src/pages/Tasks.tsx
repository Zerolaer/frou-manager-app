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
import { Repeat } from 'lucide-react'

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
  const [mobileDate, setMobileDate] = React.useState(new Date())
  
  
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
      console.error('Error moving task:', error)
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
        if (!activeProject) setActiveProject(TASK_PROJECT_ALL)
        return
      }
      // fallback to id,name only
      const basic = await supabase.from('tasks_projects').select('id,name').order('created_at', { ascending:true })
      if (!basic.error){
        const list = (basic.data || []) as Project[]
        setProjects(list)
        if (!activeProject) setActiveProject(TASK_PROJECT_ALL)
      }
    })()
}, [uid])

  // tasks for the week of active project
  const [tasks, setTasks] = React.useState<Record<string, TaskItem[]>>({})
  // All tasks for calendar (entire month)
  const [allTasks, setAllTasks] = React.useState<Record<string, TaskItem[]>>({})
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
        .select('id,project_id,title,description,date,position,priority,tag,todos,status,recurring_task_id,tasks_projects(name)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date',     { ascending:true })
        .order('position', { ascending:true })
      
      // Filter: 'ALL' shows ALL tasks from all projects, specific project shows only that project's tasks
      const query = (activeProject===TASK_PROJECT_ALL) ? q : q.eq('project_id', activeProject)
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
  }, [uid, activeProject, start, end])

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
      
      if (activeProject !== TASK_PROJECT_ALL) {
        q.eq('project_id', activeProject)
      }
      
      const { data, error } = await q
      
      if (cancelled) return
      
      if (error) {
        console.error('Error fetching all tasks:', error)
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
  }, [uid, activeProject, calendarMonth])

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
      if (!error && data){
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
    } finally {
      setCtx(c => ({ ...c, open: false }))
    }
  }

  async function deleteTask(task: TaskItem, dayKey: string){
    // Check if this is a recurring task
    if (task.recurring_task_id) {
      // Count how many tasks have the same recurring_task_id
      const recurringTasks = Object.values(tasks)
        .flat()
        .filter(t => t.recurring_task_id === task.recurring_task_id)
      
      if (recurringTasks.length > 1) {
        // Show recurring delete modal
        setTaskToDelete({ task, dayKey })
        setShowRecurringDelete(true)
        setCtx(c => ({ ...c, open: false }))
        return
      }
    }
    
    // Delete single task (either non-recurring or the last recurring task)
    await deleteSingleTask(task, dayKey)
  }
  
  async function deleteSingleTask(task: TaskItem, dayKey: string) {
    try{
      await supabase.from('tasks_items').delete().eq('id', task.id)
      const map = { ...tasks }
      const list = map[dayKey] || []
      const idx = list.findIndex(x => x.id === task.id)
      if (idx >= 0){ list.splice(idx,1); map[dayKey] = list }
      setTasks(map)
      console.log('Task deleted successfully')
    } catch (error) {
      console.error('Error deleting task:', error)
    } finally {
      setCtx(c => ({ ...c, open: false }))
      setShowRecurringDelete(false)
      setTaskToDelete(null)
    }
  }
  
  async function deleteAllRecurringTasks(task: TaskItem) {
    if (!task.recurring_task_id) return
    
    try {
      // Delete all tasks with the same recurring_task_id
      await supabase
        .from('tasks_items')
        .delete()
        .eq('recurring_task_id', task.recurring_task_id)
      
      // Update local state - remove all tasks with this recurring_task_id
      const map = { ...tasks }
      Object.keys(map).forEach(date => {
        map[date] = map[date].filter(t => t.recurring_task_id !== task.recurring_task_id)
        if (map[date].length === 0) {
          delete map[date]
        }
      })
      setTasks(map)
      
      const recurringTasks = Object.values(tasks)
        .flat()
        .filter(t => t.recurring_task_id === task.recurring_task_id)
      
      console.log(`Deleted ${recurringTasks.length} recurring tasks`)
    } catch (error) {
      console.error('Error deleting recurring tasks:', error)
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
      
      console.log('Task updated successfully')
    } catch (error) {
      console.error('Error updating task:', error)
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
      
      const recurringTasks = Object.values(tasks)
        .flat()
        .filter(t => t.recurring_task_id === task.recurring_task_id)
      
      console.log(`Updated ${recurringTasks.length} recurring tasks`)
    } catch (error) {
      console.error('Error updating recurring tasks:', error)
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
      console.log(`Project created: ${name}`)
      setProjectName('')
      setOpenNewProject(false)
    } else if (error) {
      console.error('Error creating project:', error)
    }
  }

  // create task modal
  const [openNewTask, setOpenNewTask] = React.useState(false)
  const [taskDate, setTaskDate] = React.useState<Date|null>(null)
  const [taskTitle, setTaskTitle] = React.useState('')
  const [taskDesc, setTaskDesc] = React.useState('')

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
      const instances = generateRecurringTaskInstances(startDate, recurringSettings)
      
      logger.debug('🔄 Creating recurring tasks:', { 
        title, 
        instancesCount: instances.length,
        startDate: startDate.toISOString().split('T')[0]
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
          recurrence_interval: recurringSettings.interval,
          recurrence_day_of_week: recurringSettings.dayOfWeek,
          recurrence_day_of_month: recurringSettings.dayOfMonth,
          start_date: startDate.toISOString().split('T')[0],
          end_date: recurringSettings.endDate?.toISOString().split('T')[0],
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

      for (const instance of instances) {
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
        } else if (error) {
          logger.error('❌ Error creating recurring task instance:', error)
        }
      }

      // Update tasks state
      setTasks(taskMap)
      
      // Show success message
      const message = createdTasks.length > 1 
        ? `Создано ${createdTasks.length} повторяющихся задач`
        : 'Повторяющаяся задача создана'
      console.log(message)
      
      setTaskTitle('')
      setTaskDesc('')
      setOpenNewTask(false)

    } catch (error) {
      logger.error('❌ Error creating recurring tasks:', error)
      console.error('Error creating recurring tasks:', error)
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

    // Handle recurring tasks
    if (recurringSettings?.isRecurring && recurringSettings.recurrenceType) {
      await createRecurringTasks(targetDate, resolvedProject, title, desc, priority, tag, todos, recurringSettings)
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
      console.log(`Task created: ${title}`)
      setTaskTitle(''); setTaskDesc('')
      setOpenNewTask(false)
    } else if (error) {
      console.error('Error creating task:', error)
      }
    }
  }

  // Function to update recurring task settings
  const updateRecurringTaskSettings = async (taskId: string, settings: RecurringTaskSettings) => {
    if (!uid) return

    try {
      // Find the recurring_task_id for this task
      const task = Object.values(tasks).flat().find(t => t.id === taskId)
      if (!task?.recurring_task_id) {
        console.error('Task not found or not a recurring task')
        return
      }

      // Update the recurring_tasks record
      const { error } = await supabase
        .from('recurring_tasks')
        .update({
          recurrence_type: settings.recurrenceType,
          recurrence_interval: settings.interval,
          recurrence_day_of_week: settings.dayOfWeek,
          recurrence_day_of_month: settings.dayOfMonth,
          end_date: settings.endDate?.toISOString().split('T')[0]
        })
        .eq('id', task.recurring_task_id)

      if (error) {
        console.error('Error updating recurring task settings:', error)
        throw error
      }

      if (import.meta.env.DEV) console.log('✅ Recurring task settings updated')
    } catch (error) {
      console.error('❌ Error updating recurring task settings:', error)
      throw error
    }
  }

  // Handle task updates - check for recurring tasks
  const handleTaskUpdate = async (updatedTask: any | null, isSave?: boolean) => {
    if (import.meta.env.DEV) {
      console.log('🔄 handleTaskUpdate called:', { 
        updatedTask: updatedTask?.title, 
        isSave, 
        viewTask: viewTask?.title,
        viewTaskRecurringId: viewTask?.recurring_task_id
      })
    }
    
    // Handle task deletion (updatedTask is null)
    if (!updatedTask) {
      setViewTask(null)
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
    
    if (import.meta.env.DEV) {
      console.log('🔍 Changes detected:', {
        hasChanges,
        hasRelevantChanges,
        titleChanged: updatedTask.title !== viewTask.title,
        descriptionChanged: updatedTask.description !== viewTask.description,
        priorityChanged: updatedTask.priority !== viewTask.priority,
        tagChanged: updatedTask.tag !== viewTask.tag,
        dateChanged: updatedTask.date !== viewTask.date,
        projectChanged: updatedTask.project_id !== viewTask.project_id,
        todosChanged: JSON.stringify(updatedTask.todos) !== JSON.stringify(viewTask.todos)
      })
    }
    
    // Only check for recurring tasks when it's actually a manual save operation AND there are relevant changes
    if (isSave && viewTask.recurring_task_id && hasRelevantChanges) {
      if (import.meta.env.DEV) console.log('🔍 Checking recurring tasks for save operation with changes')
      
      try {
        // Check database directly for all tasks with this recurring_task_id
        const { data: dbRecurringTasks, error } = await supabase
          .from('tasks_items')
          .select('id, title')
          .eq('recurring_task_id', viewTask.recurring_task_id)
        
        if (error) throw error
        
        console.log('📊 Database recurring tasks found:', {
          recurringTaskId: viewTask.recurring_task_id,
          dbTasksCount: dbRecurringTasks?.length || 0,
          dbTaskTitles: dbRecurringTasks?.map(t => t.title) || []
        })
        
        if (dbRecurringTasks && dbRecurringTasks.length > 1) {
          console.log('✅ Showing recurring edit modal')
          // Show recurring edit modal
          setTaskToEdit({ task: viewTask, updates: updatedTask })
          setShowRecurringEdit(true)
          return
        } else {
          console.log('❌ Not enough recurring tasks in database, updating directly')
        }
      } catch (error) {
        console.error('❌ Error checking recurring tasks:', error)
        // Fallback to local state check
        const allTasks = Object.values(tasks).flat()
        const recurringTasks = allTasks.filter(t => t.recurring_task_id === viewTask.recurring_task_id)
        
        if (recurringTasks.length > 1) {
          console.log('✅ Showing recurring edit modal (fallback)')
          setTaskToEdit({ task: viewTask, updates: updatedTask })
          setShowRecurringEdit(true)
          return
        }
      }
    } else {
      console.log('❌ Not showing recurring modal:', {
        isSave,
        hasRecurringId: !!viewTask.recurring_task_id,
        hasRelevantChanges
      })
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
    
    // Add to new date
    if (newDate) {
      if (!map[newDate]) {
        map[newDate] = []
      }
      
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
      

      {/* Right area: week grid (no outer header - buttons inside table) */}
      <section className="tasks-board">
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
                    className="btn btn-outline btn-xs add-on-hover"
                    onClick={()=>{ setTaskDate(d); setOpenNewTask(true) }}
                  >+ {t('tasks.createTask')}</button>
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
                            if (!hasMovedRef.current && !isDraggingRef.current) {
                              logger.debug('✅ Opening task modal immediately')
                              setViewTask(taskItem)
                            } else {
                              logger.debug('❌ Not opening - was dragging')
                            }
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
                                  className={`text-xs font-medium px-2 py-1 ${taskItem.status === TASK_STATUSES.CLOSED ? 'opacity-30' : ''}`}
                                  style={{
                                    backgroundColor: getPriorityColor(taskItem.priority).background,
                                    color: getPriorityColor(taskItem.priority).text,
                                    borderRadius: '999px !important'
                                  }}
                                >
                                  {getPriorityText(taskItem.priority)}
                                </span>
                              ) : (
                                <div></div>
                              )}
                              {taskItem.tag && (
                                <span 
                                  className={`text-xs font-medium px-2 py-1 ${taskItem.status === TASK_STATUSES.CLOSED ? 'opacity-30' : ''}`}
                                  style={{
                                    backgroundColor: '#f3f4f6',
                                    color: '#6b7280',
                                    borderRadius: '999px !important'
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

      {/* Task modals */}
      <ModernTaskModal
        key={viewTask?.id || 'new'}
        open={!!viewTask}
        onClose={()=>setViewTask(null)}
        task={viewTask}
        onUpdated={handleTaskUpdate}
        onUpdateRecurrence={updateRecurringTaskSettings}
      />

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
            setStart(startOfWeek(date, { weekStartsOn: 1 }))
          }
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
