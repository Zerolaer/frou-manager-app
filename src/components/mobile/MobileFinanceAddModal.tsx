import React, { useState } from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { CoreInput } from '@/components/ui/CoreInput'
import { TypeDropdown } from '@/components/ui/UnifiedDropdown'
import MobileModal from '@/components/ui/MobileModal'
import { ModalButton } from '@/components/ui/ModalSystem'

type Props = {
  open: boolean
  onClose: () => void
  onAddCategory: (type: 'income' | 'expense', name: string) => void
}

export default function MobileFinanceAddModal({ open, onClose, onAddCategory }: Props) {
  const { t } = useSafeTranslation()
  const [newType, setNewType] = useState<'income' | 'expense'>('income')
  const [newName, setNewName] = useState('')

  const handleAdd = () => {
    if (!newName.trim()) return
    onAddCategory(newType, newName.trim())
    setNewName('')
    onClose()
  }

  return (
    <MobileModal
      open={open}
      onClose={() => {
        onClose()
        setNewName('')
      }}
      title={t('finance.newCategory')}
      footer={
        <div className="flex gap-3 p-4">
          <ModalButton
            variant="secondary"
            onClick={() => {
              onClose()
              setNewName('')
            }}
            className="flex-1"
          >
            {t('actions.cancel')}
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="flex-1"
          >
            {t('finance.addCategory')}
          </ModalButton>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('finance.type')}
          </label>
          <TypeDropdown value={newType} onChange={(value) => setNewType(value as 'income' | 'expense')} fullWidth />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('finance.name')}
          </label>
          <CoreInput
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('finance.placeholderHousing')}
            autoFocus
          />
        </div>
      </div>
    </MobileModal>
  )
}
