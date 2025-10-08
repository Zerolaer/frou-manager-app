import { useState } from 'react'
import { UnifiedModal } from '@/components/ui/ModalSystem'
import { ModalField, ModalInput, ModalContent } from '@/components/ui/ModalForm'
import ModalFooter from '@/components/ui/ModalFooter'
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
    <UnifiedModal
      open={open}
      onClose={onClose}
      title="Новый проект"
      footer={
        <ModalFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Создание...' : 'Создать'}
          </button>
        </ModalFooter>
      }
    >
      <ModalContent>
        <ModalField label="Название" required>
          <ModalInput
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
    </UnifiedModal>
  )
}

export default ProjectCreateModal