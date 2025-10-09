import React from 'react'
import { supabase } from '@/lib/supabaseClient'
import ProjectCreateModal from '@/components/ProjectCreateModal'
import Modal from '@/components/ui/Modal'
import { CoreInput } from '@/components/ui/CoreInput'
import { ChevronLeft, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { Project } from '@/types/shared'

type Props = {
  userId: string
  activeId: string | null
  onChange: (id: string | null) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const COLORS = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#06b6d4','#3b82f6','#6366f1','#a855f7','#ec4899','#f43f5e','#64748b']

const ProjectSidebar = ({ userId, activeId, onChange, collapsed = false, onToggleCollapse }: Props) => {
  const { t } = useTranslation()
  const [items, setItems] = React.useState<Project[]>([])
  const [showCreate, setShowCreate] = React.useState(false)
  const [hasColor, setHasColor] = React.useState(false)
  const [hasPosition, setHasPosition] = React.useState(false)
  const [hoveredProject, setHoveredProject] = React.useState<string | null>(null)

  // load with feature detection
  React.useEffect(()=>{
    if (!userId) return
    ;(async()=>{
      // try extended select
      const ext = await supabase.from('tasks_projects').select('id,name,color,position').order('position', { ascending:true }).order('created_at', { ascending:true })
      if (!ext.error){
        setHasColor(true); setHasPosition(true)
        const projectsList = (ext.data||[]) as Project[]
        
        // If user has no projects, create default "Uncategorized" project
        if (projectsList.length === 0) {
          const { data: newProject } = await supabase
            .from('tasks_projects')
            .insert({ user_id: userId, name: t('projects.uncategorized'), position: 0 })
            .select('id,name,color,position')
            .single()
          
          if (newProject) {
            projectsList.push(newProject as Project)
          }
        }
        
        setItems(([{ id: 'ALL', name: t('projects.allProjects'), color: null } as any, ...projectsList]))
        return
      }
      // fallback to id,name only
      const basic = await supabase.from('tasks_projects').select('id,name').order('created_at', { ascending:true })
      if (!basic.error) {
        const projectsList = (basic.data||[]) as Project[]
        
        // If user has no projects, create default "Uncategorized" project
        if (projectsList.length === 0) {
          const { data: newProject } = await supabase
            .from('tasks_projects')
            .insert({ user_id: userId, name: t('projects.uncategorized') })
            .select('id,name')
            .single()
          
          if (newProject) {
            projectsList.push(newProject as Project)
          }
        }
        
        setItems(([{ id: 'ALL', name: t('projects.allProjects'), color: null } as any, ...projectsList]))
      }
    })()
  },[userId])

  // DnD reorder
  const dragId = React.useRef<string|null>(null)
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
  const [ctxOpen, setCtxOpen] = React.useState(false)
  const [ctxPos, setCtxPos] = React.useState({x:0,y:0})
  const [ctxProject, setCtxProject] = React.useState<Project|null>(null)
  const menuRef = React.useRef<HTMLDivElement|null>(null)
  React.useEffect(()=>{
    const onDoc = (e:MouseEvent)=>{
      if (ctxOpen && menuRef.current && !menuRef.current.contains(e.target as any)) setCtxOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return ()=> document.removeEventListener('mousedown', onDoc)
  },[ctxOpen])

  function openCtx(e:React.MouseEvent, p:Project){
  if(p.id==='ALL') return;
    e.preventDefault()
    
    // Calculate menu position with viewport clamping
    const menuWidth = 150;
    const menuHeight = 100;
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    let x = e.clientX;
    let y = e.clientY;
    
    // Check if menu would go off the right edge
    if (x + menuWidth > vw - pad) {
      x = vw - menuWidth - pad;
    }
    
    // Check if menu would go off the bottom edge
    if (y + menuHeight > vh - pad) {
      y = vh - menuHeight - pad;
    }
    
    // Ensure menu doesn't go off the left edge
    if (x < pad) {
      x = pad;
    }
    
    // Ensure menu doesn't go off the top edge
    if (y < pad) {
      y = pad;
    }
    
    setCtxProject(p)
    setCtxPos({ x, y })
    setCtxOpen(true)
  }

  // rename/delete
  const [renameOpen, setRenameOpen] = React.useState(false)
  const [renameValue, setRenameValue] = React.useState('')
  const [delOpen, setDelOpen] = React.useState(false)

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
    <aside className="tasks-projects rounded-3xl bg-white" style={{ width: collapsed ? 72 : 260, border: '1px solid #E9F2F6', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="flex items-center mb-3" style={{ 
        position: 'relative',
        height: '34px'
      }}>
        <button 
          className="btn btn-outline w-[34px] h-[34px] p-0 flex items-center justify-center week-nav" 
          onClick={onToggleCollapse} 
          aria-label={collapsed ? t('aria.expand') : t('aria.collapse')}
          style={{ 
            position: 'absolute',
            left: '0',
            flexShrink: 0
          }}
        >
          <ChevronLeft 
            size={16} 
            style={{ 
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', 
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
            }} 
          />
        </button>
        
        <div 
          className="text-sm font-semibold text-gray-700" 
          style={{ 
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            transition: 'opacity 0.2s ease', 
            opacity: collapsed ? 0 : 1,
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
          }}
        >
          {t('projects.title')}
        </div>
        
        <button 
          className="btn btn-outline w-[34px] h-[34px] p-0 flex items-center justify-center week-nav" 
          onClick={()=>setShowCreate(true)} 
          aria-label={t('projects.addProject')} 
          style={{ 
            position: 'absolute',
            right: '0',
            flexShrink: 0,
            transition: 'opacity 0.2s ease',
            opacity: collapsed ? 0 : 1,
            pointerEvents: collapsed ? 'none' : 'auto'
          }}
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        {items.map((p)=> (
          <div key={p.id} className="relative" style={{ width: '100%' }}>
            <button
              draggable={p.id!=='ALL'}
              onDragStart={()=>onDragStart(p.id)}
              onDragOver={(e)=>{ e.preventDefault(); }}
              onDrop={()=>onDropOver(p.id)}
              onClick={()=>onChange(p.id)}
              onContextMenu={(e)=>openCtx(e,p)}
              onMouseEnter={()=>collapsed && setHoveredProject(p.id)}
              onMouseLeave={()=>setHoveredProject(null)}
              className={`border h-[42px] flex items-center text-left ${activeId===p.id ? 'border-black bg-black text-white' : 'border-gray-200 hover:bg-gray-50'}`}
              style={{ 
                borderRadius: '12px', 
                width: collapsed ? '42px' : '100%',
                position: 'relative',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden'
              }}
            >
              <span style={{ 
                color: activeId===p.id ? '#ffffff' : (p.color || '#94a3b8'), 
                display: 'inline-flex', 
                alignItems: 'center',
                flexShrink: 0,
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>
              </span>
              <span 
                className="truncate" 
                style={{ 
                  transition: 'opacity 0.2s ease', 
                  opacity: collapsed ? 0 : 1,
                  whiteSpace: 'nowrap',
                  marginLeft: '28px',
                  display: 'block',
                  fontSize: '14px'
                }}
              >
                {p.name}
              </span>
            </button>
            {collapsed && hoveredProject === p.id && (
              <>
                <style>{`
                  @keyframes tooltipFadeIn {
                    0% {
                      opacity: 0;
                      transform: translateX(-12px) scale(0.92) rotateY(-8deg);
                    }
                    60% {
                      opacity: 1;
                      transform: translateX(2px) scale(1.02) rotateY(2deg);
                    }
                    100% {
                      opacity: 1;
                      transform: translateX(0) scale(1) rotateY(0deg);
                    }
                  }
                `}</style>
                <div 
                  className="absolute left-full ml-2 z-[100] bg-black text-white whitespace-nowrap pointer-events-none shadow-lg"
                  style={{ 
                    top: '50%',
                    marginTop: '-21px',
                    borderRadius: '12px', 
                    fontSize: '13px',
                    padding: '10px 14px',
                    animation: 'tooltipFadeIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transformStyle: 'preserve-3d',
                    perspective: '1000px'
                  }}
                >
                  {p.name}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {ctxOpen && ctxProject && (
        <>
          <div className="fixed inset-0 z-10" onClick={()=>setCtxOpen(false)} />
          <div 
            ref={menuRef} 
            style={{ 
              position: 'fixed',
              left: ctxPos.x, 
              top: ctxPos.y, 
              zIndex: 1000
            }}
          >
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-60">
              <button
                onClick={()=>{ setRenameValue(ctxProject.name); setRenameOpen(true); setCtxOpen(false) }}
                className="w-full px-2 py-3 text-left transition-colors rounded-lg text-gray-700 hover:bg-gray-100"
                style={{ fontSize: '13px' }}
              >
                {t('projects.rename')}
              </button>
              <div className="px-2 py-3">
                <div className="mb-2 text-xs text-gray-500">{t('projects.color')}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:6 }}>
                  {COLORS.map(c=>(
                    <button 
                      key={c} 
                      onClick={()=>changeColor(c)} 
                      style={{ 
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: '50%',
                        background: c, 
                        border: '2px solid rgba(0,0,0,.08)',
                        cursor: 'pointer'
                      }} 
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={()=>{ setDelOpen(true); setCtxOpen(false) }}
                className="w-full px-2 py-3 text-left transition-colors rounded-lg text-red-600 hover:bg-red-50"
                style={{ fontSize: '13px' }}
              >
                {t('actions.delete')}
              </button>
            </div>
          </div>
        </>
      )}

      <ProjectCreateModal open={showCreate} onClose={()=>setShowCreate(false)} userId={userId} onCreated={createOk} />

      <Modal
        open={renameOpen}
        onClose={()=>setRenameOpen(false)}
        title={t('projects.renameProject')}
        footer={
          <>
            <button
              onClick={() => setRenameOpen(false)}
              className="inline-flex items-center justify-center px-4 font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors leading-none h-10"
              style={{ borderRadius: '12px', fontSize: '13px', border: '1px solid #E5E7EB' }}
            >
              {t('actions.cancel')}
            </button>
            <button
              onClick={renameOk}
              disabled={!renameValue.trim()}
              className="inline-flex items-center justify-center px-4 font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed leading-none h-10"
              style={{ borderRadius: '12px', fontSize: '13px', backgroundColor: '#171717' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d0d0d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#171717'}
            >
              {t('actions.save')}
            </button>
          </>
        }
      >
        <CoreInput value={renameValue} onChange={(e)=>setRenameValue(e.target.value)} />
      </Modal>

      <Modal
        open={delOpen}
        onClose={()=>setDelOpen(false)}
        title={t('projects.deleteProject')}
        footer={
          <>
            <button
              onClick={() => setDelOpen(false)}
              className="inline-flex items-center justify-center px-4 font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors leading-none h-10"
              style={{ borderRadius: '12px', fontSize: '13px', border: '1px solid #E5E7EB' }}
            >
              {t('actions.cancel')}
            </button>
            <button
              onClick={deleteOk}
              className="inline-flex items-center justify-center px-4 font-medium text-white bg-red-600 hover:bg-red-700 transition-colors leading-none h-10"
              style={{ borderRadius: '12px', fontSize: '13px' }}
            >
              {t('actions.delete')}
            </button>
          </>
        }
      >
        <div className="text-sm text-gray-600">{t('projects.deleteWarning')}</div>
      </Modal>
    </aside>
  )
}

export default ProjectSidebar