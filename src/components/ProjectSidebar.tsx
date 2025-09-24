import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import ProjectCreateModal from '@/components/ProjectCreateModal'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'

import type { Project } from '@/types/shared'

type Props = {
  userId: string
  activeId: string | null
  onChange: (id: string | null) => void
}

const COLORS = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#06b6d4','#3b82f6','#6366f1','#a855f7','#ec4899','#f43f5e','#64748b']

export default function ProjectSidebar({ userId, activeId, onChange }: Props){
  const [items, setItems] = useState<Project[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [hasColor, setHasColor] = useState(false)
  const [hasPosition, setHasPosition] = useState(false)
  const { createSimpleFooter, createDangerFooter } = useModalActions()

  // load with feature detection
  useEffect(()=>{
    if (!userId) return
    ;(async()=>{
      // try extended select
      const ext = await supabase.from('tasks_projects').select('id,name,color,position').order('position', { ascending:true }).order('created_at', { ascending:true })
      if (!ext.error){
        setHasColor(true); setHasPosition(true)
        setItems(([{ id: 'ALL', name: 'Все проекты', color: null } as any, ...((ext.data||[]) as Project[])]))
        return
      }
      // fallback to id,name only
      const basic = await supabase.from('tasks_projects').select('id,name').order('created_at', { ascending:true })
      if (!basic.error) setItems(([{ id: 'ALL', name: 'Все проекты', color: null } as any, ...((basic.data||[]) as Project[])]))
    })()
  },[userId])

  // DnD reorder
  const dragId = useRef<string|null>(null)
  function onDragStart(id:string){ dragId.current = id }
  async function onDropOver(id:string){
    const from = dragId.current; dragId.current = null
    if (!from || from===id) return
    if (!hasPosition){
      // client-only reorder if DB not supported
      const list = [...items]
      const a = list.findIndex(p=>p.id===from)
      const b = list.findIndex(p=>p.id===id)
      if (a<0 || b<0) return
      const [moved] = list.splice(a,1)
      list.splice(b,0,moved)
      setItems(list)
      return
    }
    const list = [...items]
    const a = list.findIndex(p=>p.id===from)
    const b = list.findIndex(p=>p.id===id)
    if (a<0 || b<0) return
    const [moved] = list.splice(a,1)
    list.splice(b,0,moved)
    const withPos = list.map((p,i)=>({ ...p, position:i }))
    setItems(withPos)
    await Promise.all(withPos.map(p=> supabase.from('tasks_projects').update({ position:p.position }).eq('id', p.id)))
  }

  // context menu
  const [ctxOpen, setCtxOpen] = useState(false)
  const [ctxPos, setCtxPos] = useState({x:0,y:0})
  const [ctxProject, setCtxProject] = useState<Project|null>(null)
  const menuRef = useRef<HTMLDivElement|null>(null)
  useEffect(()=>{
    const onDoc = (e:MouseEvent)=>{
      if (ctxOpen && menuRef.current && !menuRef.current.contains(e.target as any)) setCtxOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return ()=> document.removeEventListener('mousedown', onDoc)
  },[ctxOpen])

  function openCtx(e:React.MouseEvent, p:Project){
  if(p.id==='ALL') return;
    e.preventDefault()
    setCtxProject(p)
    setCtxPos({ x:e.clientX, y:e.clientY })
    setCtxOpen(true)
  }

  // rename/delete
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [delOpen, setDelOpen] = useState(false)

  async function renameOk(){
    if (!ctxProject) return
    const name = renameValue.trim()
    if (!name) return
    await supabase.from('tasks_projects').update({ name }).eq('id', ctxProject.id)
    setItems(items.map(p=> p.id===ctxProject.id ? {...p, name} : p))
    setRenameOpen(false)
  }
  async function deleteOk(){
    if (!ctxProject) return
    await supabase.from('tasks_projects').delete().eq('id', ctxProject.id)
    setItems(items.filter(p=> p.id!==ctxProject.id))
    if (activeId===ctxProject.id) onChange(null)
    setDelOpen(false)
  }

  // color change (graceful if no column)
  async function changeColor(c:string){
    if (!ctxProject) return
    if (hasColor){
      await supabase.from('tasks_projects').update({ color:c }).eq('id', ctxProject.id)
    }
    setItems(items.map(p=> p.id===ctxProject.id ? {...p, color:c} : p))
    setCtxOpen(false)
  }

  function createOk(p:{id:string, name:string, color?:string}){
    setItems(prev=> [...prev, { id:p.id, name:p.name, color:p.color }])
    onChange(p.id)
  }

  return (
    <aside className="tasks-projects rounded-xl border border-gray-200 bg-white" style={{ width: 280 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-700">Проекты</div>
        <button className="btn btn-outline w-[34px] h-[34px] p-0 flex items-center justify-center" onClick={()=>setShowCreate(true)}>+</button>
      </div>
      <div className="space-y-1">
        
        {items.map((p)=> (
          <div key={p.id}>
            <button
              draggable={p.id!=='ALL'}
              onDragStart={()=>onDragStart(p.id)}
              onDragOver={(e)=>{ e.preventDefault(); }}
              onDrop={()=>onDropOver(p.id)}
              onClick={()=>onChange(p.id)}
              onContextMenu={(e)=>openCtx(e,p)}
              className={`w-full rounded-lg border px-3 py-2 text-left flex items-center gap-2 ${activeId===p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
              title={p.name}
            >
              <span className="mr-2 inline-flex items-center" style={{ color: p.color || '#94a3b8' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>
              </span>
              <span className="truncate">{p.name}</span>
            </button>
            
          </div>
        ))}
      </div>

      {ctxOpen && ctxProject && (
        <>
          <div className="ctx-backdrop" onClick={()=>setCtxOpen(false)} />
          <div className="ctx-menu" ref={menuRef} style={{ left: ctxPos.x, top: ctxPos.y, minWidth: 200, padding: 6 }}>
            <div className="dd-item" onClick={()=>{ setRenameValue(ctxProject.name); setRenameOpen(true); setCtxOpen(false) }}>Переименовать</div>
            <div className="dd-item">
              <div className="mb-1 text-xs text-gray-500">Цвет</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 18px)', gap:6 }}>
                {COLORS.map(c=>(
                  <button key={c} onClick={()=>changeColor(c)} style={{ width:18, height:18, borderRadius:9999, background:c, border:'1px solid rgba(0,0,0,.08)' }} />
                ))}
              </div>
            </div>
            <div className="dd-item" style={{ color:'#b91c1c' }} onClick={()=>{ setDelOpen(true); setCtxOpen(false) }}>Удалить</div>
          </div>
        </>
      )}

      <ProjectCreateModal open={showCreate} onClose={()=>setShowCreate(false)} userId={userId} onCreated={createOk} />

      <UnifiedModal
        open={renameOpen}
        onClose={()=>setRenameOpen(false)}
        title="Переименовать проект"
        footer={createSimpleFooter(
          { 
            label: 'Сохранить', 
            onClick: renameOk,
            disabled: !renameValue.trim()
          },
          { 
            label: 'Отмена', 
            onClick: () => setRenameOpen(false)
          }
        )}
      >
        <input className="border rounded-lg px-3 py-2 text-sm w-full" value={renameValue} onChange={(e)=>setRenameValue(e.target.value)} />
      </UnifiedModal>

      <UnifiedModal
        open={delOpen}
        onClose={()=>setDelOpen(false)}
        title="Удалить проект?"
        footer={createDangerFooter(
          { 
            label: 'Удалить', 
            onClick: deleteOk
          },
          { 
            label: 'Отмена', 
            onClick: () => setDelOpen(false)
          }
        )}
      >
        <div className="text-sm text-gray-600">Проект и связанные задачи будут удалены.</div>
      </UnifiedModal>
    </aside>
  )
}