import React, { useEffect, useState } from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { CoreInput } from '@/components/ui/CoreInput'
import { TypeDropdown } from '@/components/ui/UnifiedDropdown'
import MobileModal from '@/components/ui/MobileModal'
import { ModalButton } from '@/components/ui/ModalSystem'

type ParentCategory = {
  id: string
  name: string
}

type Props = {
  open: boolean
  initialType?: 'income' | 'expense'
  parentCategory?: ParentCategory | null
  onClose: () => void
  onAddCategory: (type: 'income' | 'expense', name: string, parentId?: string) => void
}

export default function MobileFinanceAddModal({
  open,
  initialType = 'income',
  parentCategory = null,
  onClose,
  onAddCategory,
}: Props) {
  const { t } = useSafeTranslation()
  const [newType, setNewType] = useState<'income' | 'expense'>(initialType)
  const [newName, setNewName] = useState('')
  const isSubcategory = !!parentCategory

  useEffect(() => {
    if (open) setNewType(initialType)
  }, [open, initialType])

  const handleClose = () => {
    onClose()
    setNewName('')
  }

  const handleAdd = () => {
    if (!newName.trim()) return
    onAddCategory(newType, newName.trim(), parentCategory?.id)
    setNewName('')
    onClose()
  }

  return (
    <MobileModal
      open={open}
      onClose={handleClose}
      title={isSubcategory ? t('finance.newSubcategory') : t('finance.newCategory')}
      footer={
        <div className="flex gap-3 p-4">
          <ModalButton variant="secondary" onClick={handleClose} className="flex-1">
            {t('actions.cancel')}
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="flex-1"
          >
            {isSubcategory ? t('finance.addSubcategory') : t('finance.addCategory')}
          </ModalButton>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        {isSubcategory && (
          <p className="text-sm text-gray-600">
            {t('finance.parent')}:{' '}
            <span className="font-medium text-gray-900">{parentCategory.name}</span>
          </p>
        )}

        {!isSubcategory && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('finance.type')}
            </label>
            <TypeDropdown
              value={newType}
              onChange={(value) => setNewType(value as 'income' | 'expense')}
              fullWidth
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('finance.name')}
          </label>
          <CoreInput
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={
              isSubcategory ? t('finance.placeholderUtilities') : t('finance.placeholderHousing')
            }
            className="min-h-11"
            autoFocus
          />
        </div>
      </div>
    </MobileModal>
  )
}
