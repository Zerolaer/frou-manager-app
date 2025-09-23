import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { supabase } from '@/lib/supabaseClient'

const COLORS = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#06b6d4','#3b82f6','#6366f1','#a855f7','#ec4899','#f43f5e','#64748b']

type Props = {
  open: boolean
  onClose: () => void
  userId: string
  onCreated: (p: { id:string, name:string, color?:string }) => void
}

export default function ProjectCreateModal({ open, onClose, userId, onCreated }: Props){
  const [name, setName] = useState('')
  const [color, setColor] = useState<string|undefined>(COLORS[8])

  async function submit(){
    const n = name.trim()
    if (!n) return
    // Insert at least name; color may fail on server if column absent, so we set it client-side after
    let createdId = ''
    let createdName = n
    // Try with color first
    let res = await supabase.from('tasks_projects').insert({ user_id:userId, name:n, color }).select('id,name').single()
    if (res.error){
      // Fallback: insert without color
      const res2 = await supabase.from('tasks_projects').insert({ user_id:userId, name:n }).select('id,name').single()
      if (res2.error) return
      createdId = res2.data!.id
      createdName = res2.data!.name
    }else{
      createdId = res.data!.id
      createdName = res.data!.name
    }
    onCreated({ id: createdId, name: createdName, color })
    setName(''); onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новый проект"
      footer={<><button className="btn btn-outline" onClick={onClose}>Отмена</button><button className="btn" onClick={submit}>Создать</button></>}
    >
      <div className="flex items-center gap-3 mb-3">
        <label className="text-sm text-gray-600 w-28">Название</label>
        <input
          value={name}
          onChange={(e)=>setName(e.target.value)}
          placeholder="Например, Website Redesign"
          className="border rounded-lg px-3 py-2 text-sm flex-1"
          autoFocus
        />
      </div>
      <div className="flex items-start gap-3">
        <label className="text-sm text-gray-600 w-28">Цвет</label>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 22px)', gap:8 }}>
          {COLORS.map(c=>(
            <button key={c} onClick={()=>setColor(c)} title={c} style={{ width:22, height:22, borderRadius:9999, background:c, border: color===c ? '2px solid #111827' : '1px solid rgba(0,0,0,.08)' }} />
          ))}
        </div>
      </div>
    </Modal>
  )
}
