import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { ModalField, ModalContent } from '@/components/ui/ModalForm'
import { CoreInput } from '@/components/ui/CoreInput'
import { supabase } from '@/lib/supabaseClient'

const COLORS = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#06b6d4','#3b82f6','#6366f1','#a855f7','#ec4899','#f43f5e','#64748b']

type Props = {
  open: boolean
  onClose: () => void
  userId: string
  onCreated: (p: { id:string, name:string, color?:string }) => void
}

const ProjectCreateModal = ({ open, onClose, userId, onCreated }: Props) => {
  const [name, setName] = useState('')
  const [color, setColor] = useState<string|undefined>(COLORS[8])
  const [loading, setLoading] = useState(false)

  async function submit(){
    const n = name.trim()
    if (!n) return
    
    setLoading(true)
    try {
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
      setName('')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новый проект"
      footer={
        <>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center px-4 font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors leading-none h-10"
            style={{ borderRadius: '12px', fontSize: '13px', border: '1px solid #E5E7EB' }}
          >
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || loading}
            className="inline-flex items-center justify-center px-4 font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed leading-none h-10"
            style={{ borderRadius: '12px', fontSize: '13px', backgroundColor: '#171717' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d0d0d'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#171717'}
          >
            {loading ? 'Создание...' : 'Создать'}
          </button>
        </>
      }
    >
      <ModalContent>
        <ModalField label="Название" required>
          <CoreInput
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Например, Website Redesign"
            autoFocus
          />
        </ModalField>
        
        <ModalField label="Цвет">
          <div className="grid grid-cols-7 gap-2">
            {COLORS.map(c => (
              <button 
                key={c} 
                onClick={() => setColor(c)} 
                title={c}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  color === c ? 'border-gray-900' : 'border-gray-200'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </ModalField>
      </ModalContent>
    </Modal>
  )
}

export default ProjectCreateModal