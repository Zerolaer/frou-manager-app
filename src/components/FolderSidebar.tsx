import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'

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
}

const COLORS = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#06b6d4','#3b82f6','#6366f1','#a855f7','#ec4899','#f43f5e','#64748b']

export default function FolderSidebar({ userId, activeId, onChange }: Props){
  const [items, setItems] = useState<Folder[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [hasColor, setHasColor] = useState(false)
  const [hasPosition, setHasPosition] = useState(false)
  const { createSimpleFooter, createDangerFooter } = useModalActions()

  // load with feature detection
  useEffect(()=>{
    if (!userId) return
    ;(async()=>{
      // try extended select
      const ext = await supabase.from('notes_folders').select('id,name,color,position').order('position', { ascending:true }).order('created_at', { ascending:true })
      if (!ext.error){
        setHasColor(true); setHasPosition(true)
        setItems(([{ id: 'ALL', name: 'Все папки', color: null } as any, ...((ext.data||[]) as Folder[])]))
        return
      }
      // fallback to id,name only
      const basic = await supabase.from('notes_folders').select('id,name').order('created_at', { ascending:true })
      if (!basic.error) setItems(([{ id: 'ALL', name: 'Все папки', color: null } as any, ...((basic.data||[]) as Folder[])]))
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
    await Promise.all(withPos.map(p=> supabase.from('notes_folders').update({ position:p.position }).eq('id', p.id)))
  }

  // context menu
  const [ctxOpen, setCtxOpen] = useState(false)
  const [ctxPos, setCtxPos] = useState({x:0,y:0})
  const [ctxFolder, setCtxFolder] = useState<Folder|null>(null)
  const menuRef = useRef<HTMLDivElement|null>(null)
  useEffect(()=>{
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
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [delOpen, setDelOpen] = useState(false)

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
  const [createName, setCreateName] = useState('')
  const [createColor, setCreateColor] = useState('#3b82f6')

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
    <aside className="notes-folders">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-700">Папки</div>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>
              </span>
              <span className="truncate">{p.name}</span>
            </button>
            
          </div>
        ))}
      </div>

      {ctxOpen && ctxFolder && (
        <>
          <div className="ctx-backdrop" onClick={()=>setCtxOpen(false)} />
          <div className="ctx-menu" ref={menuRef} style={{ left: ctxPos.x, top: ctxPos.y, minWidth: 200, padding: 6 }}>
            <div className="dd-item" onClick={()=>{ setRenameValue(ctxFolder.name); setRenameOpen(true); setCtxOpen(false) }}>Переименовать</div>
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

      {/* Create Folder Modal */}
      <UnifiedModal
        open={showCreate}
        onClose={()=>setShowCreate(false)}
        title="Создать папку"
        footer={createSimpleFooter(
          { 
            label: 'Создать', 
            onClick: createOk,
            disabled: !createName.trim()
          },
          { 
            label: 'Отмена', 
            onClick: () => setShowCreate(false)
          }
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название папки</label>
            <input 
              className="border rounded-lg px-3 py-2 text-sm w-full" 
              value={createName} 
              onChange={(e)=>setCreateName(e.target.value)}
              placeholder="Введите название папки"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Цвет</label>
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
        title="Переименовать папку"
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
        title="Удалить папку?"
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
        <div className="text-sm text-gray-600">Папка и связанные заметки будут удалены.</div>
      </UnifiedModal>
    </aside>
  )
}
