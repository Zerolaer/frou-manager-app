// Tasks.tsx — Tag tint tweak (alpha 0.2) + UPPERCASE — 2025-08-27T11:57:52.457526Z
import React, { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { addWeeks, subWeeks, startOfWeek, endOfWeek, format, addDays, subDays } from 'date-fns'
import { ru } from 'date-fns/locale/ru'
import ProjectSidebar from '@/components/ProjectSidebar'
import WeekTimeline from '@/components/WeekTimeline'
import ModernTaskModal from '@/components/ModernTaskModal'
import TaskAddModal from '@/components/TaskAddModal'
import MobileDayNavigator from '@/components/MobileDayNavigator'
import MobileTasksDay from '@/components/tasks/MobileTasksDay'
import { FadeIn } from '@/components/ContentLoader'
import '@/tasks.css'
import { useErrorHandler } from '@/lib/errorHandler'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { TASK_PRIORITIES, TASK_STATUSES, TASK_PROJECT_ALL } from '@/lib/constants'
import { clampToViewport } from '@/features/finance/utils'
import { createPortal } from 'react-dom'

// Функция для затемнения цвета (делает цвет темнее)
function darkenColor(hex: string, factor: number = 0.3): string {
  // Убираем # если есть
  hex = hex.replace('#', '')
  
  // Конвертируем в RGB
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Затемняем каждый канал
  const darkenedR = Math.floor(r * (1 - factor))
  const darkenedG = Math.floor(g * (1 - factor))
  const darkenedB = Math.floor(b * (1 - factor))
  
  // Конвертируем обратно в hex
  const toHex = (n: number) => {
    const hex = n.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  
  return `#${toHex(darkenedR)}${toHex(darkenedG)}${toHex(darkenedB)}`
}

// Пастельная палитра цветов как на картинке
const PASTEL_COLORS = [
  { light: '#e8eaf6', dark: '#3f51b5' }, // светло-фиолетовый
  { light: '#fff3e0', dark: '#ff9800' }, // светло-оранжевый  
  { light: '#e8f5e8', dark: '#4caf50' }, // светло-зеленый
  { light: '#e3f2fd', dark: '#2196f3' }, // светло-голубой
  { light: '#fce4ec', dark: '#e91e63' }, // светло-розовый
  { light: '#f3e5f5', dark: '#9c27b0' }, // светло-фиолетовый
  { light: '#e0f2f1', dark: '#009688' }, // светло-бирюзовый
  { light: '#fff8e1', dark: '#ffc107' }, // светло-желтый
]

// Функция для получения пастельного цвета на основе ID задачи
function getPastelColor(taskId: string): { light: string, dark: string } {
  const hash = taskId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length]
}

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
        className="ctx-menu"
        style={{
          position: 'fixed',
          left: adjustedPos.x,
          top: adjustedPos.y,
          zIndex: 1000,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          minWidth: '160px',
          padding: '4px 0'
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="ctx-item" onClick={onDuplicate}>Дублировать</div>
        <div className="ctx-item" onClick={onToggleStatus}>
          {task?.status === TASK_STATUSES.CLOSED ? 'Открыть' : 'Выполнить'}
        </div>
        <div className="ctx-item text-red-600" onClick={onDelete}>Удалить</div>
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
        console.log('Unknown action:', action)
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

  // Сохраняем информацию о задаче для перетаскивания
  const [pendingDrag, setPendingDrag] = useState<{
    task: TaskItem
    dayKey: string
    index: number
  } | null>(null)

  // Простое разделение: клик = открытие, зажатие = перетаскивание
  function handleMouseDown(e: React.MouseEvent, task: TaskItem, dayKey: string, index: number) {
    console.log('Mouse down on task:', task.title, 'day:', dayKey, 'index:', index)
    
    // Отключаем выделение текста при зажатии мыши, но только для левой кнопки
    if (e.button === 0) {
      e.preventDefault()
    }
    
    // Сохраняем позицию клика и информацию о задаче
    setMouseDownPos({ x: e.clientX, y: e.clientY })
    setHasMoved(false)
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
        console.log('Mouse movement detected - starting drag, distance:', distance)
        setHasMoved(true)
        
        // Используем сохраненную информацию о задаче из handleMouseDown
        const { task, dayKey, index } = pendingDrag
        console.log('Starting drag for task:', task.title, 'from day:', dayKey, 'index:', index)
        
        setDraggedTask(task)
        setDragSource({ dayKey, index })
        setIsDragging(true)
        
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
    console.log('Element below mouse:', elementBelow?.className)
    
    // Try to find day column from element below
    let dayCol = elementBelow?.closest('.day-col')
    
    // If not found, try to find by checking all day columns
    if (!dayCol) {
      const allDayCols = document.querySelectorAll('.day-col')
      console.log('Found day columns:', allDayCols.length)
      
      for (const col of allDayCols) {
        const rect = col.getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX <= rect.right && 
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          dayCol = col
          console.log('Found day column by bounds')
          break
        }
      }
    }
    
    if (dayCol) {
      const dayKey = dayCol.getAttribute('data-day-key')
      console.log('Day key:', dayKey)
      
      if (dayKey) {
        // Find position within the day
        const taskCards = dayCol.querySelectorAll('.task-card:not(.is-dragging)')
        let targetIndex = taskCards.length // Default to end
        
        console.log('Task cards found:', taskCards.length, 'default targetIndex:', targetIndex)
        
        // Check if we're dragging over the day-body area
        const dayBody = dayCol.querySelector('.day-body')
        if (dayBody) {
          const bodyRect = dayBody.getBoundingClientRect()
          const relativeY = e.clientY - bodyRect.top
          const bodyHeight = bodyRect.height
          
          console.log('Day body height:', bodyHeight, 'relative Y:', relativeY, 'mouseY:', e.clientY, 'bodyTop:', bodyRect.top)
          
          if (taskCards.length === 0) {
            // Empty column - place at beginning
            targetIndex = 0
            console.log('Empty column - setting to 0')
          } else {
            // Find position based on cards
            let foundPosition = false
            for (let i = 0; i < taskCards.length; i++) {
              const card = taskCards[i]
              const rect = card.getBoundingClientRect()
              console.log(`Card ${i}: top=${rect.top}, bottom=${rect.bottom}, height=${rect.height}, mouseY=${e.clientY}`)
              
              if (e.clientY < rect.top + rect.height / 2) {
                targetIndex = i
                foundPosition = true
                console.log('Setting targetIndex to:', targetIndex)
                break
              }
            }
            
            // If we didn't find a position above any card, place at end
            if (!foundPosition) {
              targetIndex = taskCards.length
              console.log('No position found above cards - setting to end:', targetIndex)
            }
          }
        } else {
          // Fallback: if no day-body found, place at end
          targetIndex = taskCards.length
          console.log('No day-body found - setting to end:', targetIndex)
        }
        
        console.log('Final targetIndex:', targetIndex, 'total cards:', taskCards.length, 'dayKey:', dayKey)
        setDropTarget({ dayKey, index: targetIndex })
      }
    }
  }

  function handleMouseUp(e: MouseEvent | React.MouseEvent) {
    // Очищаем pending drag при отпускании мыши
    if (pendingDrag) {
      setPendingDrag(null)
    }
    
    // Сбрасываем флаг движения через небольшую задержку, чтобы onClick не сработал
    setTimeout(() => {
      setHasMoved(false)
    }, 100)
    
    if (!isDragging || !draggedTask || !dragSource) return
    
    console.log('Mouse up - dropping task')
    
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
        let targetIndex = taskCards.length // Default to end
        
        // Check if we're in the bottom area of the day body
        const dayBody = dayCol.querySelector('.day-body')
        if (dayBody) {
          const bodyRect = dayBody.getBoundingClientRect()
          const relativeY = e.clientY - bodyRect.top
          const bodyHeight = bodyRect.height
          
          console.log('MouseUp - Day body height:', bodyHeight, 'relative Y:', relativeY, 'mouseY:', e.clientY)
          
          if (taskCards.length === 0) {
            // Empty column - place at beginning
            targetIndex = 0
            console.log('MouseUp - Empty column - setting to 0')
          } else {
            // Find position based on cards
            let foundPosition = false
            for (let i = 0; i < taskCards.length; i++) {
              const card = taskCards[i]
              const rect = card.getBoundingClientRect()
              if (e.clientY < rect.top + rect.height / 2) {
                targetIndex = i
                foundPosition = true
                console.log('MouseUp - Setting targetIndex to:', targetIndex)
                break
              }
            }
            
            // If we didn't find a position above any card, place at end
            if (!foundPosition) {
              targetIndex = taskCards.length
              console.log('MouseUp - No position found above cards - setting to end:', targetIndex)
            }
          }
        } else {
          // Fallback: if no day-body found, place at end
          targetIndex = taskCards.length
          console.log('MouseUp - No day-body found - setting to end:', targetIndex)
        }
        
        // Perform the drop
        console.log('Dropping at:', dayKey, 'index:', targetIndex, 'total cards:', taskCards.length)
        handleDrop(dayKey, targetIndex)
      }
    }
    
    // Clean up
    setDraggedTask(null)
    setDragSource(null)
    setDropTarget(null)
    setIsDragging(false)
    setHasMoved(false)
  }

  async function handleDrop(dayKey: string, index: number) {
    if (!draggedTask || !dragSource || !uid) return

    const fromDayKey = dragSource.dayKey
    const fromIndex = dragSource.index
    const toIndex = index

    console.log('handleDrop:', { fromDayKey, fromIndex, dayKey, toIndex })

    // Don't do anything if dropped in the same position
    if (fromDayKey === dayKey && fromIndex === toIndex) return

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
    console.log('Setting up global mouse handlers, isDragging:', isDragging)
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      console.log('Global mouse move event, isDragging:', isDragging, 'pendingDrag:', !!pendingDrag)
      handleMouseMove(e)
    }
    
    const handleGlobalMouseUp = (e: MouseEvent) => {
      console.log('Global mouse up event')
      handleMouseUp(e)
    }
    
    // Всегда добавляем обработчики для отслеживания движения мыши
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    
    return () => {
      console.log('Cleaning up global mouse handlers')
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, pendingDrag])

  // projects
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<string|null>(TASK_PROJECT_ALL)
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
        .select('id,project_id,title,description,date,position,priority,tag,todos,status')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date',     { ascending:true })
        .order('position', { ascending:true })
      
      const query = (activeProject===TASK_PROJECT_ALL) ? q : q.eq('project_id', activeProject)
      const { data, error } = await query
      
      if (cancelled) return
      
      if (error) {
        console.error('Error fetching tasks:', error)
        return
      }
      
      const map: Record<string, TaskItem[]> = {}
      ;(data || []).forEach((t: { id: string; project_id: string; title: string; description?: string; date: string; position: number; priority?: string; tag?: string; todos?: Todo[]; status?: string }) => {
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
          status: (t as { status?: string }).status || TASK_STATUSES.OPEN 
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
          project_id: (task as { project_id?: string }).project_id || activeProject,
          title: task.title,
          description: task.description || null,
          date: dayKey,
          position: newPos,
          priority: task.priority || null,
          tag: task.tag || null,
          todos: Array.isArray(task.todos) ? task.todos : [],
          status: task.status || TASK_STATUSES.OPEN
        })
        .select('id,project_id,title,description,date,position,priority,tag,todos,status').single()
      if (!error && data){
        const t: TaskItem = {
          id: data.id,
          title: data.title,
          description: data.description || undefined,
          date: data.date as string,
          position: data.position as number,
          priority: data.priority || undefined,
          tag: data.tag || undefined,
          todos: (data.todos||[]) as Todo[],
          status: (data.status as any) || TASK_STATUSES.OPEN
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
    const resolvedProject = projectIdFromModal || (activeProject && activeProject!==TASK_PROJECT_ALL ? activeProject : null)
    if (!resolvedProject) return
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
      .insert({ project_id: resolvedProject, title, description: desc, date: key, position: nextPos, priority, tag, todos })
      .select('id,project_id,title,description,date,position,priority,tag,todos,status').single()
    if (!error && data){
      const t: TaskItem = { id:data.id, project_id:data.project_id, title:data.title, description:data.description, date:data.date, position:data.position, priority:data.priority, tag:data.tag, todos: (data.todos||[]) }
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
          open={!!viewTask}
          onClose={()=>setViewTask(null)}
          task={viewTask}
          onUpdated={(t)=>{
            if(!t) return
            const map={...tasks}
            const oldDate = viewTask?.date || ""
            const newDate = t.date || ""
            
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
                newList[existingIndex] = {...newList[existingIndex], ...t}
              } else {
                newList.push(t as TaskItem)
              }
              map[newDate] = newList
            }
            
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
    <div className="tasks-page">
      {/* Левая область: панель проектов */}
      <ProjectSidebar userId={uid!} activeId={activeProject} onChange={setActiveProject} />
      

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
                    
                    return (
                      <React.Fragment key={t.id}>
                        {/* Drop indicator */}
                        {isDropTarget && (
                          <div className="drop-indicator" style={{backgroundColor: 'blue', height: '2px', margin: '1px 0'}} />
                        )}
                        
                        {/* Drop indicator at the end - show on last card when dropping at end */}
                        {(() => {
                          const shouldShow = dropTarget?.dayKey === key && dropTarget?.index === (tasks[key]?.length || 0) && index === (tasks[key]?.length || 0) - 1
                          if (shouldShow) {
                            console.log('Showing green indicator on last card:', { dayKey: key, dropTargetIndex: dropTarget?.index, currentIndex: index, totalCards: tasks[key]?.length })
                          }
                          return shouldShow
                        })() && (
                          <div className="drop-indicator" style={{backgroundColor: 'green', height: '2px', margin: '1px 0'}} />
                        )}
                        
                        {/* Drop indicator for empty columns */}
                        {dropTarget?.dayKey === key && dropTarget?.index === 0 && (tasks[key]?.length || 0) === 0 && index === 0 && (
                          <div className="drop-indicator" style={{backgroundColor: 'purple', height: '2px', margin: '1px 0'}} />
                        )}
                        
                        {/* Оригинальная карточка задачи */}
                        <div
                          className={`task-card group ${t.status === TASK_STATUSES.CLOSED ? 'is-closed' : ''} ${isDragged ? 'is-dragging' : ''} ${isGhost ? 'opacity-30' : ''}`}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
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
                            console.log('Mouse down on task card:', t.title, 'button:', e.button)
                            // Only prevent right click
                            if (e.button === 2) {
                              e.preventDefault();
                              e.stopPropagation();
                              return;
                            }
                            // Start drag on left click
                            if (e.button === 0) {
                              handleMouseDown(e, t, key, index)
                            }
                          }}
                          onClick={(e) => {
                            // Простой клик - открываем карточку, но только если не было перетаскивания
                            if (hasMoved) {
                              console.log('Click ignored - was dragging')
                              return
                            }
                            console.log('Direct click - opening task modal')
                            setViewTask(t)
                          }}
                        >
                          <div className="text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {t.priority && (
                                  <span 
                                    className={`text-xs font-medium px-2 py-1 rounded-full ${t.status === TASK_STATUSES.CLOSED ? 'opacity-30' : ''}`}
                                    style={{
                                      backgroundColor: getPriorityColor(t.priority).background,
                                      color: getPriorityColor(t.priority).text
                                    }}
                                  >
                                    {t.priority === TASK_PRIORITIES.HIGH ? "High" :
                                     t.priority === TASK_PRIORITIES.LOW ? "Low" :
                                     t.priority === TASK_PRIORITIES.MEDIUM ? "Medium" : ""}
                                  </span>
                                )}
                              </div>
                              <button
                                className="p-1 rounded hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
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
                              
                              {/* Саб-задачи - убраны */}
                              
                              <div className="text-xs text-gray-500 mt-1">
                                {(() => {
                                  const total = Array.isArray(t.todos) ? t.todos.length : 0;
                                  const done = Array.isArray(t.todos) ? t.todos.filter((x: Todo) => x.done).length : 0;
                                  return total > 0 ? `${done}/${total}` : '';
                                })()}
                              </div>
                            </div>
                        </div>
                        
                        {/* Старая карточка полностью удалена - используется только новая */}
                      </React.Fragment>
                    )
                  })}
                  
                  {/* Drop indicator at the very end of the column */}
                  {(() => {
                    const shouldShow = dropTarget?.dayKey === key && dropTarget?.index === (tasks[key]?.length || 0)
                    if (shouldShow) {
                      console.log('Showing red indicator at end of column:', { dayKey: key, dropTargetIndex: dropTarget?.index, totalCards: tasks[key]?.length })
                    }
                    return shouldShow
                  })() && (
                    <div className="drop-indicator" style={{backgroundColor: 'red', height: '2px', margin: '1px 0'}} />
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
        open={!!viewTask}
        onClose={()=>setViewTask(null)}
        task={viewTask}
        onUpdated={(t)=>{
          if(!t) return
          const map={...tasks}
          const oldDate = viewTask?.date || ""
          const newDate = t.date || ""
          
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
              newList[existingIndex] = {...newList[existingIndex], ...t}
            } else {
              newList.push(t as TaskItem)
            }
            map[newDate] = newList
          }
          
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
