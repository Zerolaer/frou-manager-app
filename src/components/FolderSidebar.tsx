import React from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabaseClient'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { ModalInput } from '@/components/ui/ModalForm'
import { ChevronLeft, Plus } from 'lucide-react'

type Folder = {
  id: string
  name: string
  color?: string
  position?: number
  created_at?: string
}

type Props = {
  userId: string
  activeId: string | null
  onChange: (id: string | null) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const COLORS = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#06b6d4','#3b82f6','#6366f1','#a855f7','#ec4899','#f43f5e','#64748b']

export default function FolderSidebar({ userId, activeId, onChange, collapsed = false, onToggleCollapse }: Props){
  const { t } = useTranslation()
  const [items, setItems] = React.useState<Folder[]>([])
  const [showCreate, setShowCreate] = React.useState(false)
  const [hasColor, setHasColor] = React.useState(false)
  const [hasPosition, setHasPosition] = React.useState(false)
  const [hoveredFolder, setHoveredFolder] = React.useState<string | null>(null)
  const { createSimpleFooter, createDangerFooter } = useModalActions()

  // load with feature detection
  React.useEffect(()=>{
    if (!userId) return
    ;(async()=>{
      // try extended select
      const ext = await supabase.from('notes_folders').select('id,name,color,position').order('position', { ascending:true }).order('created_at', { ascending:true })
      if (!ext.error){
        setHasColor(true); setHasPosition(true)
        setItems(([{ id: 'ALL', name: t('notes.allNotes'), color: null } as any, ...((ext.data||[]) as Folder[])]))
        return
      }
      // fallback to id,name only
      const basic = await supabase.from('notes_folders').select('id,name').order('created_at', { ascending:true })
      if (!basic.error) setItems(([{ id: 'ALL', name: t('notes.allNotes'), color: null } as any, ...((basic.data||[]) as Folder[])]))
    })()
  },[userId, t])

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
    await Promise.all(withPos.map(p=> supabase.from('notes_folders').update({ position:p.position }).eq('id', p.id)))
  }

  // context menu
  const [ctxOpen, setCtxOpen] = React.useState(false)
  const [ctxPos, setCtxPos] = React.useState({x:0,y:0})
  const [ctxFolder, setCtxFolder] = React.useState<Folder|null>(null)
  const menuRef = React.useRef<HTMLDivElement|null>(null)
  React.useEffect(()=>{
    const onDoc = (e:MouseEvent)=>{
      if (ctxOpen && menuRef.current && !menuRef.current.contains(e.target as any)) setCtxOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return ()=> document.removeEventListener('mousedown', onDoc)
  },[ctxOpen])

  function openCtx(e:React.MouseEvent, p:Folder){
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
    
    setCtxFolder(p)
    setCtxPos({ x, y })
    setCtxOpen(true)
  }

  // rename/delete
  const [renameOpen, setRenameOpen] = React.useState(false)
  const [renameValue, setRenameValue] = React.useState('')
  const [delOpen, setDelOpen] = React.useState(false)

  async function renameOk(){
    if (!ctxFolder) return
    const name = renameValue.trim()
    if (!name) return
    await supabase.from('notes_folders').update({ name }).eq('id', ctxFolder.id)
    setItems(items.map(p=> p.id===ctxFolder.id ? {...p, name} : p))
    setRenameOpen(false)
  }
  async function deleteOk(){
    if (!ctxFolder) return
    await supabase.from('notes_folders').delete().eq('id', ctxFolder.id)
    setItems(items.filter(p=> p.id!==ctxFolder.id))
    if (activeId===ctxFolder.id) onChange(null)
    setDelOpen(false)
  }

  // color change (graceful if no column)
  async function changeColor(c:string){
    if (!ctxFolder) return
    if (hasColor){
      await supabase.from('notes_folders').update({ color:c }).eq('id', ctxFolder.id)
    }
    setItems(items.map(p=> p.id===ctxFolder.id ? {...p, color:c} : p))
    setCtxOpen(false)
  }

  // create folder
  const [createName, setCreateName] = React.useState('')
  const [createColor, setCreateColor] = React.useState('#3b82f6')

  async function createOk(){
    const name = createName.trim()
    if (!name) return
    
    const { data, error } = await supabase.from('notes_folders').insert({
      name,
      color: createColor,
      user_id: userId
    }).select('id,name,color').single()
    
    if (!error && data) {
      setItems(prev => [...prev, data])
      onChange(data.id)
    }
    setShowCreate(false)
    setCreateName('')
    setCreateColor('#3b82f6')
  }

  return (
    <aside className="notes-folders rounded-3xl bg-white" style={{ width: collapsed ? 72 : 280, border: '1px solid #E9F2F6', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="flex items-center mb-3" style={{ 
        position: 'relative',
        height: '34px'
      }}>
        <button 
          className="btn btn-outline w-[34px] h-[34px] p-0 flex items-center justify-center week-nav" 
          onClick={onToggleCollapse} 
          aria-label={collapsed ? "Развернуть" : "Свернуть"}
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
          Папки
        </div>
        
        <button 
          className="btn btn-outline w-[34px] h-[34px] p-0 flex items-center justify-center week-nav" 
          onClick={()=>setShowCreate(true)} 
          aria-label="Добавить папку" 
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
              onMouseEnter={()=>collapsed && setHoveredFolder(p.id)}
              onMouseLeave={()=>setHoveredFolder(null)}
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
            {collapsed && hoveredFolder === p.id && (
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

      {ctxOpen && ctxFolder && (
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
                onClick={()=>{ setRenameValue(ctxFolder.name); setRenameOpen(true); setCtxOpen(false) }}
                className="w-full px-2 py-3 text-left transition-colors rounded-lg text-gray-700 hover:bg-gray-100"
                style={{ fontSize: '13px' }}
              >
                Переименовать
              </button>
              <div className="px-2 py-3">
                <div className="mb-2 text-xs text-gray-500">Цвет</div>
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

      {/* Create Folder Modal */}
      <UnifiedModal
        open={showCreate}
        onClose={()=>setShowCreate(false)}
        title={t('notes.createFolder')}
        footer={createSimpleFooter(
          { 
            label: t('actions.create'), 
            onClick: createOk,
            disabled: !createName.trim()
          },
          { 
            label: t('actions.cancel'), 
            onClick: () => setShowCreate(false)
          }
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes.folderName')}</label>
            <ModalInput 
              value={createName} 
              onChange={(e)=>setCreateName(e.target.value)}
              placeholder={t('notes.folderName')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes.color')}</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 24px)', gap:8 }}>
              {COLORS.map(c=>(
                <button 
                  key={c} 
                  onClick={()=>setCreateColor(c)} 
                  style={{ 
                    width:24, 
                    height:24, 
                    borderRadius:9999, 
                    background:c, 
                    border:createColor===c ? '2px solid #000' : '1px solid rgba(0,0,0,.08)',
                    cursor: 'pointer'
                  }} 
                />
              ))}
            </div>
          </div>
        </div>
      </UnifiedModal>

      <UnifiedModal
        open={renameOpen}
        onClose={()=>setRenameOpen(false)}
        title={t('notes.renameFolder') || 'Rename Folder'}
        footer={createSimpleFooter(
          { 
            label: t('actions.save'), 
            onClick: renameOk,
            disabled: !renameValue.trim()
          },
          { 
            label: t('actions.cancel'), 
            onClick: () => setRenameOpen(false)
          }
        )}
      >
        <ModalInput value={renameValue} onChange={(e)=>setRenameValue(e.target.value)} />
      </UnifiedModal>

      <UnifiedModal
        open={delOpen}
        onClose={()=>setDelOpen(false)}
        title={t('notes.deleteFolder') || 'Delete Folder?'}
        footer={createDangerFooter(
          { 
            label: t('actions.delete'), 
            onClick: deleteOk
          },
          { 
            label: t('actions.cancel'), 
            onClick: () => setDelOpen(false)
          }
        )}
      >
        <div className="text-sm text-gray-600">{t('notes.deleteFolderWarning') || 'Folder and related notes will be deleted.'}</div>
      </UnifiedModal>
    </aside>
  )
}
