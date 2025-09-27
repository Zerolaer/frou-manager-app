// Tasks.tsx — Tag tint tweak (alpha 0.2) + UPPERCASE — 2025-08-27T11:57:52.457526Z
import { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { addWeeks, subWeeks, startOfWeek, endOfWeek, format } from 'date-fns'
import ru from 'date-fns/locale/ru'
import ProjectSidebar from '@/components/ProjectSidebar'
import WeekTimeline from '@/components/WeekTimeline'
import TaskViewModal from '@/components/TaskViewModal'
import TaskAddModal from '@/components/TaskAddModal'
// CSS imports removed - styles now in styles.css
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

  // DnD handlers
  const dragRef = useRef<{ id:string; from:string }|null>(null)
  function onDragStart(t:TaskItem){
    dragRef.current = { id: t.id, from: t.date }
  }
  async function onDropDay(dayKey:string){
    const drag = dragRef.current; dragRef.current = null
    if (!drag) return
    if (!uid) return
    // If dropped into the same day, put item to the end
    const map = { ...tasks }
    const fromList = map[drag.from] || []
    // Capture the item BEFORE removing it, otherwise we lose the data reference
    const movingItem = fromList.find(x=>x.id===drag.id)
    const idx = fromList.findIndex(x=>x.id===drag.id)
    if (idx>=0){ fromList.splice(idx,1) }
    const toList = (map[dayKey] ||= [])
    const newPos = toList.length
    if (movingItem){
      toList.push({ ...movingItem, date: dayKey, position: newPos })
    }
    setTasks(map)
    // persist
    await supabase.from('tasks_items').update({ date: dayKey, position: newPos }).eq('id', drag.id)
  }

  // Auth handled by useSupabaseAuth hook

  // timeline
  const [start, setStart] = useState<Date>(()=> startOfWeek(new Date(), { weekStartsOn:1 }))
  const [end,   setEnd]   = useState<Date>(()=> endOfWeek(new Date(), { weekStartsOn:1 }))
  const todayKey = format(new Date(),'yyyy-MM-dd')
  useEffect(()=>{
    setEnd(endOfWeek(start, { weekStartsOn:1 }))
  }, [start])

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
          todos: Array.isArray(task.todos) ? task.todos : []
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
          todos: (data.todos||[]) as Todo[]
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
  async function createTask(titleFromModal?: string, descFromModal?: string, priorityFromModal?: string, tagFromModal?: string, todosFromModal?: Todo[], projectIdFromModal?: string){
    if (!uid || !taskDate) return
    const resolvedProject = projectIdFromModal || (activeProject && activeProject!==TASK_PROJECT_ALL ? activeProject : null)
    if (!resolvedProject) return
    const title = (titleFromModal ?? taskTitle).trim()
    const desc  = (descFromModal ?? taskDesc)
    const priority = (priorityFromModal ?? TASK_PRIORITIES.NORMAL)
    const tag = (tagFromModal ?? '')
    const todos = (Array.isArray(todosFromModal) ? todosFromModal! : [])
    if (!title) return
    const key = format(taskDate, 'yyyy-MM-dd')
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
              <div onDragOver={(e)=>e.preventDefault()} onDrop={()=>onDropDay(key)} className={`day-col ${([0,6].includes(new Date(d).getDay()) ? "is-weekend" : "")} ${key===todayKey ? "is-today" : ""}`} key={key}>
                <div className="day-head">
                  <span>{format(d,'EEE, d MMM', { locale: ru })}</span>
                  <button
                    className="btn btn-outline btn-xs add-on-hover"
                    onClick={()=>{ setTaskDate(d); setOpenNewTask(true) }}
                  >+ Задача</button>
                </div>
                <div className="day-body">
  {(tasks[key] || []).map((t) => (
    <div
      key={t.id}
      className={`task-card ${t.status === TASK_STATUSES.CLOSED ? 'is-closed' : ''}`}
      style={{
        backgroundColor: projectColorById[t.project_id]
          ? hexToRgba(projectColorById[t.project_id], 0.1)
          : undefined,
        border: projectColorById[t.project_id]
          ? `1px solid ${hexToRgba(projectColorById[t.project_id], 0.5)}`
          : "1px solid #e5e7eb"
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setCtx({
          open: true,
          x: e.clientX,
          y: e.clientY,
          task: t,
          dayKey: key,
        });
      }}
      onMouseDownCapture={(e) => {
        if (e.button === 2) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onDragStart={() => onDragStart(t)}
      onClick={(e) => { if (ctx.open) return; setViewTask(t) }}
      draggable
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
  ))}
</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Модалка: новый проект */}
      <TaskAddModal open={openNewTask} projects={projects} activeProject={activeProject} onClose={()=>setOpenNewTask(false)} dateLabel={taskDate ? format(taskDate, "d MMMM, EEEE", { locale: ru }) : ""} onSubmit={async (title, desc, prio, tag, todos, projId)=>{ await createTask(title, desc, prio, tag, todos, projId) }} />

      <TaskViewModal
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

      {ctx.open && (<>
        <div className="ctx-backdrop" onClick={()=>setCtx(c=>({...c, open:false}))} />
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <div className="ctx-item" onClick={()=> ctx.task && ctx.dayKey && duplicateTask(ctx.task, ctx.dayKey)}>Дублировать</div>
          <div className="ctx-item" onClick={async()=>{ if(ctx.task && ctx.dayKey){ await supabase.from('tasks_items').update({status:TASK_STATUSES.CLOSED}).eq('id', ctx.task.id); setTasks(prev=>{ const copy={...prev}; const arr=[...(copy[ctx.dayKey]||[])]; const i=arr.findIndex(x=>x.id===ctx.task!.id); if(i>=0){ arr[i]={...arr[i], status:TASK_STATUSES.CLOSED}; } copy[ctx.dayKey]=arr; return copy; }); setCtx(c=>({...c, open:false})) }}}>Выполнить</div>
          <div className="ctx-item text-red-600" onClick={()=> ctx.task && ctx.dayKey && deleteTask(ctx.task, ctx.dayKey)}>Удалить</div>
        </div>
      </>)}


    </div>
  )
}
