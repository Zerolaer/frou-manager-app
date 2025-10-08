// Tasks.tsx — Tag tint tweak (alpha 0.2) + UPPERCASE — 2025-08-27T11:57:52.457526Z
import React, { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { addWeeks, subWeeks, startOfWeek, endOfWeek, format } from 'date-fns'
import { ru } from 'date-fns/locale/ru'
import ProjectSidebar from '@/components/ProjectSidebar'
import WeekTimeline from '@/components/WeekTimeline'
import ModernTaskModal from '@/components/ModernTaskModal'
import TaskAddModal from '@/components/TaskAddModal'
import MobileDayNavigator from '@/components/MobileDayNavigator'
import MobileTasksDay from '@/components/tasks/MobileTasksDay'
import '@/tasks.css'
import { useErrorHandler } from '@/lib/errorHandler'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { TASK_PRIORITIES, TASK_STATUSES, TASK_PROJECT_ALL } from '@/lib/constants'
import { clampToViewport } from '@/features/finance/utils'
import { createPortal } from 'react-dom'

// Функция для получения цвета приоритета
function getPriorityColor(priority: string): { background: string, text: string } {
  switch (priority) {
    case TASK_PRIORITIES.HIGH:
      return { background: '#fee2e2', text: '#dc2626' } // красный
    case TASK_PRIORITIES.MEDIUM:
      return { background: '#fed7aa', text: '#ea580c' } // оранжевый
    case TASK_PRIORITIES.LOW:
      return { background: '#dcfce7', text: '#16a34a' } // зеленый
    default:
      return { background: '#f3f4f6', text: '#6b7280' } // серый по умолчанию
  }
}

function getPriorityText(priority?: string): string | null {
  switch (priority) {
    case TASK_PRIORITIES.HIGH:
      return "High"
    case TASK_PRIORITIES.MEDIUM:
      return "Medium"
    case TASK_PRIORITIES.LOW:
      return "Low"
    case TASK_PRIORITIES.NORMAL:
      return "Normal"
    default:
      return null
  }
}

// Task Context Menu component with smart positioning
function TaskContextMenu({ 
  x, y, task, dayKey, onClose, onDuplicate, onToggleStatus, onDelete 
}: {
  x: number
  y: number
  task: TaskItem | null
  dayKey?: string
  onClose: () => void
  onDuplicate: () => void
  onToggleStatus: () => void
  onDelete: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPos, setAdjustedPos] = useState({ x, y })

  // Smart positioning - don't go off screen
  useEffect(() => {
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Close on click outside
  useEffect(() => {
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
            className="w-full px-2 py-3 text-left transition-colors rounded-lg text-gray-700 hover:bg-gray-100"
            style={{ fontSize: '13px' }}
          >
            Дублировать
          </button>
          <button
            onClick={onToggleStatus}
            className="w-full px-2 py-3 text-left transition-colors rounded-lg text-gray-700 hover:bg-gray-100"
            style={{ fontSize: '13px' }}
          >
            {task?.status === TASK_STATUSES.CLOSED ? 'Открыть' : 'Выполнить'}
          </button>
          <button
            onClick={onDelete}
            className="w-full px-2 py-3 text-left transition-colors rounded-lg text-red-600 hover:bg-red-50"
            style={{ fontSize: '13px' }}
          >
            Удалить
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
  const { handleError, handleSuccess } = useErrorHandler()
  const { userId: uid, loading: authLoading } = useSupabaseAuth()
  const { isMobile } = useMobileDetection()
  const [viewTask, setViewTask] = useState<TaskItem|null>(null)
  const [mobileDate, setMobileDate] = useState(new Date())

  // SubHeader actions handler
  function handleSubHeaderAction(action: string) {
    switch (action) {
      case 'add-task':
        setOpenNewTask(true)
        break
      case 'filter':
        // TODO: Implement filter functionality
        handleSuccess('Фильтр будет реализован в следующей версии')
        break
      case 'calendar':
        // TODO: Implement calendar view
        handleSuccess('Календарный вид будет реализован в следующей версии')
        break
      case 'search':
        // TODO: Implement search functionality
        handleSuccess('Поиск будет реализован в следующей версии')
        break
      default:
        // Unknown action
    }
  }

  // New DnD system with mouse events
  const [draggedTask, setDraggedTask] = useState<TaskItem | null>(null)
  const [dragSource, setDragSource] = useState<{dayKey: string, index: number} | null>(null)
  const [dropTarget, setDropTarget] = useState<{dayKey: string, index: number} | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [dragStartTimer, setDragStartTimer] = useState<NodeJS.Timeout | null>(null)
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 })
  const [hasMoved, setHasMoved] = useState(false)
  
  // Use ref to track dragging state for click handler
  const hasMovedRef = useRef(false)
  const isDraggingRef = useRef(false)

  // Сохраняем информацию о задаче для перетаскивания
  const [pendingDrag, setPendingDrag] = useState<{
    task: TaskItem
    dayKey: string
    index: number
  } | null>(null)

  // Простое разделение: клик = открытие, зажатие = перетаскивание
  function handleMouseDown(e: React.MouseEvent, task: TaskItem, dayKey: string, index: number) {
    // Отключаем выделение текста при зажатии мыши, но только для левой кнопки
    if (e.button === 0) {
      e.preventDefault()
    }
    
    console.log('🖱️ Mouse down on task:', task.title)
    
    // Сохраняем позицию клика и информацию о задаче
    setMouseDownPos({ x: e.clientX, y: e.clientY })
    setHasMoved(false)
    hasMovedRef.current = false
    setPendingDrag({ task, dayKey, index })
  }

  function handleMouseMove(e: MouseEvent | React.MouseEvent) {
    // Проверяем, двинулась ли мышь достаточно далеко для начала перетаскивания
    if (!isDragging && !dragStartTimer) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.x, 2) + 
        Math.pow(e.clientY - mouseDownPos.y, 2)
      )
      
      if (distance > 5 && pendingDrag) { // Если мышь сдвинулась больше чем на 5px и есть задача для перетаскивания
        console.log('🚀 Starting drag, distance:', distance)
        setHasMoved(true)
        hasMovedRef.current = true
        
        // Используем сохраненную информацию о задаче из handleMouseDown
        const { task, dayKey, index } = pendingDrag
        
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
        
        // Очищаем pending drag
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
          
          console.log('📍 Day body rect:', { relativeY, bodyHeight, mouseY: e.clientY, bodyTop: bodyRect.top })
          
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
              
              console.log(`📍 Card ${i}: top=${rect.top}, center=${cardCenter}, mouseY=${e.clientY}, isAbove=${e.clientY < cardCenter}`)
              
              if (e.clientY < cardCenter) {
                // If we're dragging from the same day, we need to adjust the index
                // because the dragged task is hidden from taskCards
                if (isSameDay && dragSource && dragSource.index <= i) {
                  targetIndex = i + 1 // Place after the card we're hovering over
                  console.log('📍 Same day drag: adjusting index from', i, 'to', targetIndex)
                } else {
                  targetIndex = i
                }
                foundPosition = true
                console.log('📍 Found position above card', i, 'at Y:', rect.top, 'final targetIndex:', targetIndex)
                break
              }
            }
            
            // If we didn't find a position above any card, place at end
            if (!foundPosition) {
              targetIndex = isSameDay ? actualTaskCount : taskCards.length
              console.log('📍 No position found above cards, placing at end (isSameDay:', isSameDay, 'actualTaskCount:', actualTaskCount, ')')
            }
          }
        } else {
          // Fallback: if no day-body found, place at end
          targetIndex = isSameDay ? actualTaskCount : taskCards.length
        }
        // console.log('🎯 Setting drop target:', { dayKey, targetIndex, taskCardsLength: taskCards.length, actualTaskCount, isSameDay })
        setDropTarget({ dayKey, index: targetIndex })
      }
    }
  }

  function handleMouseUp(e: MouseEvent | React.MouseEvent) {
    console.log('🖱️ Mouse up, isDragging:', isDragging, 'hasMoved:', hasMoved, 'hasMovedRef:', hasMovedRef.current, 'isDraggingRef:', isDraggingRef.current)
    
    // Очищаем pending drag при отпускании мыши
    if (pendingDrag) {
      console.log('🔄 Clearing pending drag')
      setPendingDrag(null)
    }
    
    // CRITICAL: Only handle drop if we were actually dragging AND moved
    // Use refs for immediate check without state delay
    if (!isDraggingRef.current || !hasMovedRef.current || !draggedTask || !dragSource) {
      console.log('❌ NOT CALLING handleDrop - no real drag detected')
      // Clean up drag state
      setDraggedTask(null)
      setDragSource(null)
      setDropTarget(null)
      setIsDragging(false)
      isDraggingRef.current = false
      
      // Сбрасываем флаг движения через небольшую задержку, чтобы onClick не сработал
      setTimeout(() => {
        setHasMoved(false)
        hasMovedRef.current = false
      }, 100)
      return
    }
    
    console.log('✅✅✅ CALLING handleDrop - real drag detected ✅✅✅')
    
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
          
          console.log('📍 Final drop - Day body rect:', { relativeY, bodyHeight, mouseY: e.clientY, bodyTop: bodyRect.top })
          
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
              
              console.log(`📍 Final drop - Card ${i}: top=${rect.top}, center=${cardCenter}, mouseY=${e.clientY}, isAbove=${e.clientY < cardCenter}`)
              
              if (e.clientY < cardCenter) {
                // If we're dragging from the same day, we need to adjust the index
                // because the dragged task is hidden from taskCards
                if (isSameDay && dragSource && dragSource.index <= i) {
                  targetIndex = i + 1 // Place after the card we're hovering over
                  console.log('📍 Final drop - Same day drag: adjusting index from', i, 'to', targetIndex)
                } else {
                  targetIndex = i
                }
                foundPosition = true
                console.log('📍 Final drop - Found position above card', i, 'at Y:', rect.top, 'final targetIndex:', targetIndex)
                break
              }
            }
            
            // If we didn't find a position above any card, place at end
            if (!foundPosition) {
              targetIndex = isSameDay ? actualTaskCount : taskCards.length
              console.log('📍 Final drop - No position found above cards, placing at end (isSameDay:', isSameDay, 'actualTaskCount:', actualTaskCount, ')')
            }
          }
        } else {
          // Fallback: if no day-body found, place at end
          targetIndex = isSameDay ? actualTaskCount : taskCards.length
        }
        
        // console.log('🎯 Final drop at:', { dayKey, targetIndex, taskCardsLength: taskCards.length, actualTaskCount, isSameDay })
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
    hasMovedRef.current = false
  }

  async function handleDrop(dayKey: string, index: number) {
    console.log('📦 handleDrop called:', { dayKey, index, draggedTask: draggedTask?.title, fromDayKey: dragSource?.dayKey, fromIndex: dragSource?.index })
    
    if (!draggedTask || !dragSource || !uid) {
      console.log('❌ handleDrop early return - missing data')
      return
    }

    const fromDayKey = dragSource.dayKey
    const fromIndex = dragSource.index
    const toIndex = index

    // Don't do anything if dropped in the same position
    if (fromDayKey === dayKey && fromIndex === toIndex) {
      console.log('❌ handleDrop early return - same position')
      return
    }
    
    console.log('✅ handleDrop proceeding with move')

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
      console.error('Error updating task positions:', error)
      handleError('Ошибка при перемещении задачи')
    }
  }

  // Auth handled by useSupabaseAuth hook

  // timeline
  const [start, setStart] = useState<Date>(()=> startOfWeek(new Date(), { weekStartsOn:1 }))
  const [end,   setEnd]   = useState<Date>(()=> endOfWeek(new Date(), { weekStartsOn:1 }))
  const todayKey = format(new Date(),'yyyy-MM-dd')
  useEffect(()=>{
    setEnd(endOfWeek(start, { weekStartsOn:1 }))
  }, [start])

  // Listen for SubHeader actions
  useEffect(() => {
    const handleSubHeaderActionEvent = (event: CustomEvent) => {
      handleSubHeaderAction(event.detail)
    }
    
    window.addEventListener('subheader-action', handleSubHeaderActionEvent as EventListener)
    return () => {
      window.removeEventListener('subheader-action', handleSubHeaderActionEvent as EventListener)
    }
  }, [])

  // Global mouse event handlers for drag and drop
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMouseMove(e)
    }
    
    const handleGlobalMouseUp = (e: MouseEvent) => {
      handleMouseUp(e)
    }
    
    // Всегда добавляем обработчики для отслеживания движения мыши
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, pendingDrag, mouseDownPos, hasMoved, draggedTask, dragSource])

  // projects
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<string|null>(TASK_PROJECT_ALL)
  const [projectsCollapsed, setProjectsCollapsed] = useState(() => {
    const saved = localStorage.getItem('frovo_projects_collapsed')
    return saved === 'true'
  })
const projectColorById = useMemo(() => {
    const m: Record<string, string|undefined> = {}
    for (const p of projects) m[p.id] = p.color || undefined
    return m
  }, [projects])

  useEffect(() => {
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
  const [tasks, setTasks] = useState<Record<string, TaskItem[]>>({})
  // Track last active project to clear cache on project switch
  const lastActiveProject = useRef(activeProject)
  
  useEffect(() => {
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
        .select('id,project_id,title,description,date,position,priority,tag,todos,status,tasks_projects(name)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date',     { ascending:true })
        .order('position', { ascending:true })
      
      // Filter: 'ALL' shows ALL tasks from all projects, specific project shows only that project's tasks
      const query = (activeProject===TASK_PROJECT_ALL) ? q : q.eq('project_id', activeProject)
      const { data, error } = await query
      
      
      if (cancelled) return
      
      if (error) {
        console.error('❌ Error fetching tasks:', error)
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
          project_name: t.tasks_projects?.name || null
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

// context menu state for task cards
  const [ctx, setCtx] = useState<{ open: boolean; x: number; y: number; task: TaskItem | null; dayKey?: string }>({
    open: false, x: 0, y: 0, task: null, dayKey: undefined
  })

  useEffect(() => {
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
    try{
      await supabase.from('tasks_items').delete().eq('id', task.id)
      const map = { ...tasks }
      const list = map[dayKey] || []
      const idx = list.findIndex(x => x.id === task.id)
      if (idx >= 0){ list.splice(idx,1); map[dayKey] = list }
      setTasks(map)
    } finally {
      setCtx(c => ({ ...c, open: false }))
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
  const days = useMemo(() => {
    const arr: Date[] = []
    const d0 = new Date(start)
    for (let i=0; i<7; i++) {
      arr.push(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i))
    }
    return arr
  }, [start])

  // create project modal
  const [openNewProject, setOpenNewProject] = useState(false)
  const [projectName, setProjectName] = useState('')
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
      handleSuccess(`Проект "${name}" создан`)
      setProjectName('')
      setOpenNewProject(false)
    } else if (error) {
      handleError(error, 'Создание проекта')
    }
  }

  // create task modal
  const [openNewTask, setOpenNewTask] = useState(false)
  const [taskDate, setTaskDate] = useState<Date|null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  async function createTask(titleFromModal?: string, descFromModal?: string, priorityFromModal?: string, tagFromModal?: string, todosFromModal?: Todo[], projectIdFromModal?: string, dateFromModal?: Date){
    if (!uid) return
    
    console.log('🔧 createTask called with:', {
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
      console.log('✅ Project explicitly set from modal:', resolvedProject)
    } else if (projectIdFromModal === '') {
      // User selected "Без проекта" (empty string) - task without project
      resolvedProject = null
      console.log('✅ Task without project (null)')
    } else if (activeProject && activeProject !== TASK_PROJECT_ALL) {
      // Use active project if it's not "Все проекты"
      resolvedProject = activeProject
      console.log('✅ Using active project:', resolvedProject)
    } else if (projects.length > 0) {
      // Fallback to first project ("Без категории")
      resolvedProject = projects[0].id
      console.log('⚠️ Fallback to first project:', resolvedProject)
    }
    // If no projects exist and no project selected, resolvedProject stays null
    
    console.log('🎯 Final resolvedProject:', resolvedProject)
    
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
    const { data, error } = await supabase.from('tasks_items')
      .insert({ project_id: resolvedProject, title, description: desc, date: key, position: nextPos, priority, tag, todos, user_id: uid })
      .select('id,project_id,title,description,date,position,priority,tag,todos,status,tasks_projects(name)').single()
    if (!error && data){
      const t: TaskItem = { 
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
      ;(map[key] ||= []).push(t)
      setTasks(map)
      handleSuccess(`Задача "${title}" создана`)
      setTaskTitle(''); setTaskDesc('')
      setOpenNewTask(false)
    } else if (error) {
      handleError(error, 'Создание задачи')
    }
  }

  // Get tasks for mobile date
  const mobileTasks = useMemo(() => {
    const dayKey = format(mobileDate, 'yyyy-MM-dd')
    return tasks[dayKey] || []
  }, [tasks, mobileDate])

  // Mobile view - single day display
  if (isMobile) {
    return (
      <div className="mobile-tasks-page">
        <MobileDayNavigator
          currentDate={mobileDate}
          onDateChange={setMobileDate}
          className="sticky top-0 z-10"
        />
        
        <div className="overflow-y-auto flex-1">
          <MobileTasksDay
            date={mobileDate}
            tasks={mobileTasks}
            projects={projects}
            onAddTask={() => {
              setTaskDate(mobileDate)
              setOpenNewTask(true)
            }}
            onEditTask={(task) => setViewTask(task)}
            onToggleTaskStatus={(task) => {
              const dayKey = format(mobileDate, 'yyyy-MM-dd')
              toggleTaskStatus(task, dayKey)
            }}
            onDeleteTask={(task) => {
              const dayKey = format(mobileDate, 'yyyy-MM-dd')
              deleteTask(task, dayKey)
            }}
            onDuplicateTask={(task) => {
              const dayKey = format(mobileDate, 'yyyy-MM-dd')
              duplicateTask(task, dayKey)
            }}
            onContextMenu={(e, task) => {
              // Use mouse coordinates like in finance, with small offset
              setCtx({
                open: true,
                x: e.clientX + 10, // Right of cursor
                y: e.clientY - 10, // Above cursor
                task: task,
                dayKey: format(mobileDate, 'yyyy-MM-dd'),
              })
            }}
          />
        </div>

        {/* Mobile modals */}
        <TaskAddModal 
          open={openNewTask} 
          projects={projects} 
          activeProject={activeProject} 
          onClose={()=>setOpenNewTask(false)} 
          dateLabel={taskDate ? format(taskDate, "d MMMM, EEEE", { locale: ru }) : ""} 
          initialDate={taskDate || new Date()}
          onSubmit={async (title, desc, prio, tag, todos, projId, date)=>{ await createTask(title, desc, prio, tag, todos, projId, date) }} 
        />

        <ModernTaskModal
          key={viewTask?.id || 'new'}
          open={!!viewTask}
          onClose={()=>setViewTask(null)}
          task={viewTask}
          onUpdated={(t)=>{
            if(!t) return
            console.log('🔄 onUpdated called for task:', t.title)
            const map={...tasks}
            const oldDate = viewTask?.date || ""
            const newDate = t.date || ""
            
            // Find original position of the task
            let originalPosition = -1
            if(oldDate && map[oldDate]) {
              const originalIndex = map[oldDate].findIndex(x => x.id === t.id)
              if(originalIndex >= 0) {
                originalPosition = map[oldDate][originalIndex].position || originalIndex
                console.log('📍 Original position:', originalPosition, 'at index:', originalIndex)
              }
            }
            
            // Remove from old date if it exists
            if(oldDate && map[oldDate]) {
              const oldList = map[oldDate].filter(x => x.id !== t.id)
              map[oldDate] = oldList
            }
            
            // Add to new date
            if(newDate) {
              const newList = map[newDate] || []
              const existingIndex = newList.findIndex(x => x.id === t.id)
              if(existingIndex >= 0) {
                // Update existing task, preserve position
                newList[existingIndex] = {...newList[existingIndex], ...t, position: newList[existingIndex].position} as TaskItem
                console.log('✅ Updated existing task at position:', newList[existingIndex].position)
              } else {
                // Add new task at original position or at end
                const taskWithPosition = {...t, position: originalPosition >= 0 ? originalPosition : newList.length} as TaskItem
                if(originalPosition >= 0 && originalPosition < newList.length) {
                  // Insert at original position
                  newList.splice(originalPosition, 0, taskWithPosition)
                  console.log('📍 Inserted at original position:', originalPosition)
                } else {
                  // Add to end
                  newList.push(taskWithPosition)
                  console.log('📍 Added to end, position:', taskWithPosition.position)
                }
              }
              map[newDate] = newList
            }
            
            console.log('🔄 Setting new tasks state')
            setTasks(map)
          }}
        />

        {/* Context menu */}
        {ctx.open && <TaskContextMenu 
          x={ctx.x} 
          y={ctx.y} 
          task={ctx.task}
          dayKey={ctx.dayKey}
          onClose={()=>setCtx(c=>({...c, open:false}))}
          onDuplicate={()=> ctx.task && ctx.dayKey && duplicateTask(ctx.task, ctx.dayKey)}
          onToggleStatus={()=> ctx.task && ctx.dayKey && toggleTaskStatus(ctx.task, ctx.dayKey)}
          onDelete={()=> ctx.task && ctx.dayKey && deleteTask(ctx.task, ctx.dayKey)}
        />}
      </div>
    )
  }

  // Desktop view - original week grid layout
  return (
    <div className={`tasks-page ${projectsCollapsed ? 'is-collapsed' : ''}`}>
      {/* Левая область: панель проектов */}
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
      

      {/* Правая область: грид недели (без внешней шапки — кнопки внутри таблицы) */}
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
                  <span>{format(d,'EEE, d MMM', { locale: ru })}</span>
                  <button
                    className="btn btn-outline btn-xs add-on-hover"
                    onClick={()=>{ setTaskDate(d); setOpenNewTask(true) }}
                  >+ Задача</button>
                </div>
                <div className="day-body">
                  
                  {(tasks[key] || []).map((t, index) => {
                    const isDragged = isDragging && draggedTask?.id === t.id
                    const isDropTarget = dropTarget?.dayKey === key && dropTarget?.index === index
                    const isGhost = isDragging && dragSource?.dayKey === key && dragSource?.index === index
                    
                    // Debug logging for drop target detection
                    if (dropTarget?.dayKey === key) {
                      console.log(`🔍 Card ${index}: dropTarget.index=${dropTarget?.index}, index=${index}, isDropTarget=${isDropTarget}`)
                    }
                    
                    return (
                      <React.Fragment key={t.id}>
                        {/* Drop indicator */}
                        {isDropTarget && (
                          <div className="drop-indicator" style={{
                            height: '2px',
                            margin: '4px 0',
                            borderTop: '2px dashed #000000',
                            borderRadius: '1px'
                          }} />
                        )}
                        
                        {/* Оригинальная карточка задачи */}
                        <div
                          className={`task-card group transition-all duration-150 hover:border-black ${t.status === TASK_STATUSES.CLOSED ? 'is-closed' : ''} ${isDragged ? 'is-dragging' : ''} ${isGhost ? 'opacity-30' : ''}`}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            ...(isDragged ? {
                              position: 'fixed',
                              left: dragPosition.x - 10, // Небольшое смещение от курсора
                              top: dragPosition.y - 10,  // Небольшое смещение от курсора
                              zIndex: 10001,
                              pointerEvents: 'none',
                              transform: 'none',
                              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                              opacity: 0.8, // Прозрачность
                              // НЕ меняем размеры - оставляем оригинальные
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
                              task: t,
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
                            handleMouseDown(e, t, key, index)
                          }}
                          onClick={(e) => {
                            console.log('🖱️ Click on task, hasMovedRef:', hasMovedRef.current, 'isDraggingRef:', isDraggingRef.current)
                            
                            // Only open task modal if we haven't moved the mouse (not dragging)
                            // Use ref to check current state immediately
                            if (!hasMovedRef.current && !isDraggingRef.current) {
                              console.log('✅ Opening task modal immediately')
                              setViewTask(t)
                            } else {
                              console.log('❌ Not opening - was dragging')
                            }
                          }}
                        >
                          <div className="text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {t.priority && getPriorityText(t.priority) ? (
                                  <span 
                                    className={`text-xs font-medium px-2 py-1 ${t.status === TASK_STATUSES.CLOSED ? 'opacity-30' : ''}`}
                                    style={{
                                      backgroundColor: getPriorityColor(t.priority).background,
                                      color: getPriorityColor(t.priority).text,
                                      borderRadius: '999px !important'
                                    }}
                                  >
                                    {getPriorityText(t.priority)}
                                  </span>
                                ) : (
                                  <div></div>
                                )}
                                {t.tag && (
                                  <span 
                                    className={`text-xs font-medium px-2 py-1 ${t.status === TASK_STATUSES.CLOSED ? 'opacity-30' : ''}`}
                                    style={{
                                      backgroundColor: '#f3f4f6',
                                      color: '#6b7280',
                                      borderRadius: '999px !important'
                                    }}
                                  >
                                    {t.tag}
                                  </span>
                                )}
                              </div>
                              <button
                                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
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
                                    task: t,
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
                            </div>
                              <div className="leading-tight clamp-2 break-words mb-2">
                                <span 
                                  className="font-medium text-black text-sm"
                                >
                                  {t.title}
                                </span>
                              </div>
                              
                              {/* Прогресс бар для подзадач */}
                              {(() => {
                                const total = Array.isArray(t.todos) ? t.todos.length : 0;
                                const done = Array.isArray(t.todos) ? t.todos.filter((x: Todo) => x.done).length : 0;
                                if (total === 0) return null;
                                return (
                                  <div className="space-y-1 mt-2">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                      <span>Прогресс</span>
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

                              {/* Название проекта */}
                              <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                                {t.project_name || 'Без проекта'}
                              </div>
                            </div>
                        </div>
                        
                        {/* Старая карточка полностью удалена - используется только новая */}
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

      {/* Модалка: новый проект */}
      <TaskAddModal 
        open={openNewTask} 
        projects={projects} 
        activeProject={activeProject} 
        onClose={()=>setOpenNewTask(false)} 
        dateLabel={taskDate ? format(taskDate, "d MMMM, EEEE", { locale: ru }) : ""} 
        initialDate={taskDate || new Date()}
        onSubmit={async (title, desc, prio, tag, todos, projId, date)=>{ await createTask(title, desc, prio, tag, todos, projId, date) }} 
      />

      {/* Модальные окна задач */}
      <ModernTaskModal
        key={viewTask?.id || 'new'}
        open={!!viewTask}
        onClose={()=>setViewTask(null)}
        task={viewTask}
        onUpdated={(t)=>{
          if(!t) return
          console.log('🔄 onUpdated (duplicate) called for task:', t.title)
          const map={...tasks}
          const oldDate = viewTask?.date || ""
          const newDate = t.date || ""
          
          // Find original position of the task
          let originalPosition = -1
          if(oldDate && map[oldDate]) {
            const originalIndex = map[oldDate].findIndex(x => x.id === t.id)
            if(originalIndex >= 0) {
              originalPosition = map[oldDate][originalIndex].position || originalIndex
              console.log('📍 Original position (duplicate):', originalPosition, 'at index:', originalIndex)
            }
          }
          
          // Remove from old date if it exists
          if(oldDate && map[oldDate]) {
            const oldList = map[oldDate].filter(x => x.id !== t.id)
            map[oldDate] = oldList
          }
          
          // Add to new date
          if(newDate) {
            const newList = map[newDate] || []
            const existingIndex = newList.findIndex(x => x.id === t.id)
            if(existingIndex >= 0) {
              // Update existing task, preserve position
              newList[existingIndex] = {...newList[existingIndex], ...t, position: newList[existingIndex].position} as TaskItem
              console.log('✅ Updated existing task (duplicate) at position:', newList[existingIndex].position)
            } else {
              // Add new task at original position or at end
              const taskWithPosition = {...t, position: originalPosition >= 0 ? originalPosition : newList.length} as TaskItem
              if(originalPosition >= 0 && originalPosition < newList.length) {
                // Insert at original position
                newList.splice(originalPosition, 0, taskWithPosition)
                console.log('📍 Inserted at original position (duplicate):', originalPosition)
              } else {
                // Add to end
                newList.push(taskWithPosition)
                console.log('📍 Added to end (duplicate), position:', taskWithPosition.position)
              }
            }
            map[newDate] = newList
          }
          
          console.log('🔄 Setting new tasks state (duplicate)')
          setTasks(map)
        }}
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
      />}


    </div>
  )
}
