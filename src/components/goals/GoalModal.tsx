import React, { useEffect, useState } from 'react'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { ModalField, ModalInput, ModalTextarea, ModalSelect, ModalGrid, ModalContent } from '@/components/ui/ModalForm'
import { Goal, GoalUpsert, GoalCategory, Priority } from '@/features/goals/api'

type Props = {
  open: boolean
  initial?: Goal | null
  onClose: () => void
  onSave: (values: GoalUpsert, id?: string) => void
}

const categories: GoalCategory[] = ['Здоровье', 'Финансы', 'Работа', 'Обучение', 'Прочее']
const priorities: Priority[] = ['low', 'medium', 'high']

export default function GoalModal({ open, initial, onClose, onSave }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<GoalCategory | ''>('')
  const [deadline, setDeadline] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const [priority, setPriority] = useState<Priority>('medium')
  const [loading, setLoading] = useState(false)
  const { createStandardFooter } = useModalActions()

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || '')
      setDescription(initial.description || '')
      setCategory((initial.category as Goal['category']) || 'Прочее')
      setDeadline(initial.deadline || '')
      setProgress(initial.progress ?? 0)
      setPriority(initial.priority ?? 'medium')
    } else {
      setTitle(''); setDescription(''); setCategory(''); setDeadline(''); setProgress(0); setPriority('medium')
    }
  }, [initial, open])

  async function handleSave() {
    setLoading(true)
    try {
      await onSave({
        title,
        description,
        category: (category || 'Прочее') as any,
        deadline: deadline || null,
        progress,
        priority,
        status: progress >= 100 ? 'completed' : 'active'
      }, initial?.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <UnifiedModal 
      open={open} 
      onClose={onClose} 
      title={initial ? 'Редактировать цель' : 'Новая цель'}
      footer={createStandardFooter(
        { 
          label: initial ? 'Сохранить' : 'Создать', 
          onClick: handleSave, 
          loading, 
          disabled: !title.trim() 
        },
        { label: 'Отмена', onClick: onClose }
      )}
    >
      <ModalContent>
        <ModalField label="Название" required>
          <ModalInput 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="Например, Сбросить 5 кг" 
          />
        </ModalField>
        
        <ModalField label="Описание">
          <ModalTextarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            rows={3}
          />
        </ModalField>
        
        <ModalGrid cols={2}>
          <ModalField label="Категория">
            <ModalSelect value={category} onChange={e => setCategory(e.target.value as any)}>
              <option value="">Выбрать…</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </ModalSelect>
          </ModalField>
          
          <ModalField label="Дедлайн">
            <ModalInput 
              type="date" 
              value={deadline ?? ''} 
              onChange={e => setDeadline(e.target.value)} 
            />
          </ModalField>
        </ModalGrid>
        
        <ModalGrid cols={2}>
          <ModalField label="Прогресс (%)">
            <ModalInput 
              type="number" 
              min={0} 
              max={100} 
              value={progress} 
              onChange={e => setProgress(Number(e.target.value))} 
            />
          </ModalField>
          
          <ModalField label="Приоритет">
            <ModalSelect value={priority} onChange={e => setPriority(e.target.value as Priority)}>
              {priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </ModalSelect>
          </ModalField>
        </ModalGrid>
      </ModalContent>
    </UnifiedModal>
  )
}