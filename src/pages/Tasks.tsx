// Tasks.tsx — Tag tint tweak (alpha 0.2) + UPPERCASE — 2025-08-27T11:57:52.457526Z
import React, { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { addWeeks, subWeeks, startOfWeek, endOfWeek, format } from 'date-fns'
import ru from 'date-fns/locale/ru'
import ProjectSidebar from '@/components/ProjectSidebar'
import WeekTimeline from '@/components/WeekTimeline'
import ModernTaskModal from '@/components/ModernTaskModal'
import TaskAddModal from '@/components/TaskAddModal'
import '@/tasks.css'
import { useErrorHandler } from '@/lib/errorHandler'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { TASK_PRIORITIES, TASK_STATUSES, TASK_PROJECT_ALL } from '@/lib/constants'

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
  const [viewTask, setViewTask] = useState<TaskItem|null>(null)

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

  // Простое разделение: клик = открытие, зажатие = перетаскивание
  function handleMouseDown(e: React.MouseEvent, task: TaskItem, dayKey: string, index: number) {
    console.log('Mouse down on task:', task.title)
    // НЕ preventDefault - чтобы onClick работал
    
    // Сохраняем позицию клика
    setMouseDownPos({ x: e.clientX, y: e.clientY })
    setHasMoved(false)
  }

  function handleMouseMove(e: React.MouseEvent) {
    // Проверяем, двинулась ли мышь достаточно далеко для начала перетаскивания
    if (!isDragging && !dragStartTimer) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.x, 2) + 
        Math.pow(e.clientY - mouseDownPos.y, 2)
      )
      
      if (distance > 5) { // Если мышь сдвинулась больше чем на 5px
        console.log('Mouse movement detected - starting drag')
        setHasMoved(true)
        
        // Находим задачу по позиции мыши
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY)
        if (elementBelow) {
          const taskCard = elementBelow.closest('.task-card')
          if (taskCard) {
            const dayCol = taskCard.closest('.day-col')
            if (dayCol) {
              const dayKey = dayCol.getAttribute('data-day-key')
              if (dayKey && tasks[dayKey]) {
                const taskIndex = Array.from(dayCol.querySelectorAll('.task-card')).indexOf(taskCard as Element)
                if (taskIndex >= 0 && tasks[dayKey][taskIndex]) {
                  const task = tasks[dayKey][taskIndex]
                  console.log('Starting drag for task:', task.title)
                  setDraggedTask(task)
                  setDragSource({ dayKey, index: taskIndex })
                  setIsDragging(true)
                  
                  setDragOffset({
                    x: 0,
                    y: 0
                  })
                  setDragPosition({
                    x: e.clientX,
                    y: e.clientY
                  })
                }
              }
            }
          }
        }
      }
    }
    
    if (!isDragging) return
    
    e.preventDefault()
    setDragPosition({
      x: e.clientX,
      y: e.clientY
    })
    
    // Find drop target
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY)
    if (elementBelow) {
      const dayCol = elementBelow.closest('.day-col')
      if (dayCol) {
        const dayKey = dayCol.getAttribute('data-day-key')
        if (dayKey) {
          // Find position within the day
          const taskCards = dayCol.querySelectorAll('.task-card:not(.is-dragging)')
          let targetIndex = taskCards.length
          
          for (let i = 0; i < taskCards.length; i++) {
            const card = taskCards[i]
            const rect = card.getBoundingClientRect()
            if (e.clientY < rect.top + rect.height / 2) {
              targetIndex = i
              break
            }
          }
          
          setDropTarget({ dayKey, index: targetIndex })
        }
      }
    }
  }

  function handleMouseUp(e: React.MouseEvent) {
    if (!isDragging || !draggedTask || !dragSource) return
    
    console.log('Mouse up - dropping task')
    
    // Find final drop target
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY)
    if (elementBelow) {
      const dayCol = elementBelow.closest('.day-col')
      if (dayCol) {
        const dayKey = dayCol.getAttribute('data-day-key')
        if (dayKey) {
          const taskCards = dayCol.querySelectorAll('.task-card:not(.is-dragging)')
          let targetIndex = taskCards.length
          
          for (let i = 0; i < taskCards.length; i++) {
            const card = taskCards[i]
            const rect = card.getBoundingClientRect()
            if (e.clientY < rect.top + rect.height / 2) {
              targetIndex = i
              break
            }
          }
          
          // Perform the drop
          handleDrop(dayKey, targetIndex)
        }
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
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleMouseMove(e as any)
      }
      
      const handleGlobalMouseUp = (e: MouseEvent) => {
        handleMouseUp(e as any)
      }
      
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging])

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
  useEffect(() => {
    if (!uid || !activeProject) { setTasks({});
  


 return; }
    const q = supabase.from('tasks_items')
      .select('id,project_id,title,description,date,position,priority,tag,todos,status')
      .gte('date', format(start, 'yyyy-MM-dd'))
      .lte('date', format(end,   'yyyy-MM-dd'))
      .order('date',     { ascending:true })
      .order('position', { ascending:true });
      const query = (activeProject===TASK_PROJECT_ALL) ? q : q.eq('project_id', activeProject);
      query.then(({ data }) => {
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
        setTasks(map)
      })
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

          {days.map(d => {
            const key = format(d, 'yyyy-MM-dd')
            return (
              <div 
                data-day-key={key}
                className={`day-col ${([0,6].includes(new Date(d).getDay()) ? "is-weekend" : "")} ${key===todayKey ? "is-today" : ""}`} 
                key={key}
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
                          <div className="drop-indicator" />
                        )}
                        
                        {/* Drop indicator at the end */}
                        {dropTarget?.dayKey === key && dropTarget?.index === (tasks[key]?.length || 0) && index === (tasks[key]?.length || 0) - 1 && (
                          <div className="drop-indicator" />
                        )}
                        
                        {/* Ghost card (placeholder) */}
                        {isGhost && (
                          <div className="task-card-ghost">
                            <div className="text-sm">
                              <div className="flex items-center gap-2 mb-2">
                                {t.priority && (
                                  <span className={`inline-block rounded-full w-2.5 h-2.5 ${
                                    t.priority === TASK_PRIORITIES.HIGH ? "bg-red-500" :
                                    t.priority === TASK_PRIORITIES.LOW ? "bg-green-500" :
                                    t.priority === TASK_PRIORITIES.MEDIUM ? "bg-yellow-500" : "bg-gray-300"
                                  }`} />
                                )}
                                {t.tag && (
                                  <span className="px-2 py-0.5 text-xs rounded-full leading-none uppercase bg-gray-200 text-gray-600">
                                    {t.tag}
                                  </span>
                                )}
                              </div>
                              <div className="leading-tight clamp-2 break-words mb-2">
                                <span className="font-medium text-gray-400">{t.title}</span>
                              </div>
                              <div className="text-xs text-gray-400 mt-0">
                                {(() => {
                                  const total = Array.isArray(t.todos) ? t.todos.length : 0;
                                  const done = Array.isArray(t.todos) ? t.todos.filter((x: Todo) => x.done).length : 0;
                                  return `${done}/${total}`;
                                })()}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Actual task card */}
                        <div
                          className={`task-card ${t.status === TASK_STATUSES.CLOSED ? 'is-closed' : ''} ${isDragged ? 'is-dragging' : ''}`}
                          style={{
                            backgroundColor: projectColorById[t.project_id]
                              ? hexToRgba(projectColorById[t.project_id], 0.1)
                              : undefined,
                            border: projectColorById[t.project_id]
                              ? `1px solid ${hexToRgba(projectColorById[t.project_id], 0.5)}`
                              : "1px solid #e5e7eb",
                            ...(isDragged ? {
                              position: 'fixed',
                              left: dragPosition.x, // ТОЧНО в позиции курсора
                              top: dragPosition.y,  // ТОЧНО в позиции курсора
                              zIndex: 10001,
                              pointerEvents: 'none',
                              transform: 'none',
                              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                              opacity: 1,
                              width: '200px',
                              maxWidth: '200px',
                              margin: 0, // Убираем все отступы
                              padding: 0 // Убираем padding
                            } : {})
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const menuWidth = 150;
                            const menuHeight = 120;
                            const pad = 8;
                            const vw = window.innerWidth;
                            const vh = window.innerHeight;
                            
                            let x = e.clientX;
                            let y = e.clientY;
                            
                            if (x + menuWidth > vw - pad) x = vw - menuWidth - pad;
                            if (y + menuHeight > vh - pad) y = vh - menuHeight - pad;
                            if (x < pad) x = pad;
                            if (y < pad) y = pad;
                            
                            setCtx({
                              open: true,
                              x,
                              y,
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
                            // Простой клик - открываем карточку
                            console.log('Direct click - opening task modal')
                            setViewTask(t)
                          }}
                        >
      <div className="text-sm">
        {/* Row 1: Priority dot + Tag */}
        <div className="flex items-center gap-2 mb-2">
          {t.priority ? (
            <span
              className={
                "inline-block rounded-full " +
                (                t.priority === TASK_PRIORITIES.HIGH
                  ? "w-2.5 h-2.5 bg-red-500"
                  : t.priority === TASK_PRIORITIES.LOW
                  ? "w-2.5 h-2.5 bg-green-500"
                  : t.priority === TASK_PRIORITIES.MEDIUM
                  ? "w-2.5 h-2.5 bg-yellow-500"
                  : "w-2.5 h-2.5 bg-gray-300")
              }
            />
          ) : null}
          
          {t.tag ? (
            <span
              className="px-2 py-0.5 text-xs rounded-full leading-none uppercase"
              style={{
                backgroundColor: projectColorById[t.project_id]
                  ? hexToRgba(projectColorById[t.project_id], 0.2)
                  : "#e5e7eb",
                color: "#111827",
              }}
            >
              {t.tag}
            </span>
          ) : null}

        </div>
        {/* Row 2: Title */}
        <div className="leading-tight clamp-2 break-words mb-2">
          <span className="font-medium">{t.title}</span>
        </div>
        {/* Row 3: Todos counter (done/total) */}
        <div className="text-xs text-gray-500 mt-0">
          {(() => {
            const total = Array.isArray(t.todos) ? t.todos.length : 0;
            const done = Array.isArray(t.todos) ? t.todos.filter((x: Todo) => x.done).length : 0;
            return `${done}/${total}`;
          })()}
        </div>
      </div>
                        </div>
                      </React.Fragment>
                    )
                  })}
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
          const list=map[t.date||""]||[]
          const i=list.findIndex(x=>x.id===t.id)
          if(i>=0){ 
            list[i]={...list[i], ...t}
            setTasks(map)
          }
        }}
      />

      {ctx.open && (<React.Fragment>
        <div className="ctx-backdrop" onClick={()=>setCtx(c=>({...c, open:false}))} />
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <div className="ctx-item" onClick={()=> ctx.task && ctx.dayKey && duplicateTask(ctx.task, ctx.dayKey)}>Дублировать</div>
          <div className="ctx-item" onClick={()=> ctx.task && ctx.dayKey && toggleTaskStatus(ctx.task, ctx.dayKey)}>
            {ctx.task?.status === TASK_STATUSES.CLOSED ? 'Открыть' : 'Выполнить'}
          </div>
          <div className="ctx-item text-red-600" onClick={()=> ctx.task && ctx.dayKey && deleteTask(ctx.task, ctx.dayKey)}>Удалить</div>
        </div>
      </React.Fragment>)}


    </div>
  )
}
