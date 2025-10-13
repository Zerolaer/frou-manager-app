import React, { useState } from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'

type Props = {
  open: boolean
  onClose: () => void
  onEditSingle: () => void
  onEditAll: () => void
  taskTitle?: string
  recurringCount?: number
}

type ActionType = 'single' | 'all'

export default function RecurringEditModal({ 
  open, 
  onClose, 
  onEditSingle, 
  onEditAll, 
  taskTitle, 
  recurringCount = 0 
}: Props) {
  const { t } = useSafeTranslation()
  const { createStandardFooter } = useModalActions()
  const [selectedAction, setSelectedAction] = useState<ActionType>('all')

  const handleConfirm = () => {
    if (selectedAction === 'single') {
      onEditSingle()
    } else {
      onEditAll()
    }
    onClose()
  }

  return (
    <UnifiedModal
      size="md"
      open={open}
      onClose={onClose}
      title={t('tasks.editRecurring') || 'Применить изменения'}
      variant="center"
      footer={createStandardFooter(
        { 
          label: t('common.confirm') || 'Подтвердить', 
          onClick: handleConfirm
        },
        { 
          label: t('common.cancel') || 'Отмена', 
          onClick: onClose
        }
      )}
    >
      <div className="space-y-6">
        {/* Header with task info */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {t('tasks.editRecurringWarning') || 'Повторяющаяся задача'}
          </h3>
          {taskTitle && (
            <p className="text-sm text-gray-600 mb-2">
              "{taskTitle}"
            </p>
          )}
          <p className="text-sm text-gray-600">
            {t('tasks.editRecurringDescription') || `Вы изменили повторяющуюся задачу "${taskTitle}". Выберите, как применить изменения:`}
          </p>
        </div>

        {/* Task count info */}
        {recurringCount > 1 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-800">
                {recurringCount === 1 
                  ? (t('tasks.singleTask') || '1 задача')
                  : (t('tasks.multipleTasks') || `${recurringCount} повторяющихся задач`)
                }
              </span>
            </div>
          </div>
        )}

        {/* Action options */}
        <div className="space-y-3">
          {/* Apply to all option */}
          <label 
            className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
              selectedAction === 'all' 
                ? 'border-gray-900' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            style={{
              backgroundColor: selectedAction === 'all' ? '#F2F7FA' : 'white'
            }}
            onClick={() => setSelectedAction('all')}
          >
            <input
              type="radio"
              name="action"
              value="all"
              checked={selectedAction === 'all'}
              onChange={() => setSelectedAction('all')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">
                  {t('tasks.editAllRecurring') || 'Применить ко всем задачам'}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {recurringCount > 1 
                  ? (t('tasks.editAllDescription') || 'Изменения будут применены ко всем повторяющимся задачам')
                  : (t('tasks.editAllDescriptionSingle') || 'Изменения будут применены ко всем связанным задачам')
                }
              </p>
            </div>
          </label>

          {/* Apply to single option */}
          <label 
            className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
              selectedAction === 'single' 
                ? 'border-gray-900' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            style={{
              backgroundColor: selectedAction === 'single' ? '#F2F7FA' : 'white'
            }}
            onClick={() => setSelectedAction('single')}
          >
            <input
              type="radio"
              name="action"
              value="single"
              checked={selectedAction === 'single'}
              onChange={() => setSelectedAction('single')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">
                  {t('tasks.editSingle') || 'Применить только к этой задаче'}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {t('tasks.editSingleDescription') || 'Изменения будут применены только к текущей задаче. Остальные повторения останутся без изменений.'}
              </p>
            </div>
          </label>
        </div>
      </div>
    </UnifiedModal>
  )
}