import { useState } from 'react'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { ModalField, ModalInput, ModalContent } from '@/components/ui/ModalForm'
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
  const [loading, setLoading] = useState(false)
  const { createStandardFooter } = useModalActions()

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
      footer={createStandardFooter(
        { label: 'Создать', onClick: submit, loading, disabled: !name.trim() },
        { label: 'Отмена', onClick: onClose }
      )}
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