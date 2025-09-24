import React, { useEffect, useState } from 'react'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { ModalField, ModalInput, ModalTextarea, ModalSelect, ModalGrid, ModalContent } from '@/components/ui/ModalForm'
import { Goal, GoalUpsert } from '@/features/goals/api'

type Props = {
  open: boolean
  initial?: Goal | null
  onClose: () => void
  onSave: (values: GoalUpsert, id?: string) => void
}


export default function GoalModal({ open, initial, onClose, onSave }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const { createStandardFooter } = useModalActions()

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || '')
      setDescription(initial.description || '')
      setDeadline(initial.deadline || '')
      setProgress(initial.progress ?? 0)
    } else {
      setTitle('')
      setDescription('')
      setDeadline('')
      setProgress(0)
    }
  }, [initial, open])

  async function handleSave() {
    setLoading(true)
    try {
      await onSave({
        title,
        description,
        deadline: deadline || null,
        progress
      }, initial?.id?.toString())
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
          <ModalField label="Дедлайн">
            <ModalInput 
              type="date" 
              value={deadline ?? ''} 
              onChange={e => setDeadline(e.target.value)} 
            />
          </ModalField>
          
          <ModalField label="Прогресс (%)">
            <ModalInput 
              type="number" 
              min={0} 
              max={100} 
              value={progress} 
              onChange={e => setProgress(Number(e.target.value))} 
            />
          </ModalField>
        </ModalGrid>
      </ModalContent>
    </UnifiedModal>
  )
}