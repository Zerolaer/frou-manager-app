import React from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { Trash2, AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onDeleteSingle: () => void
  onDeleteAll: () => void
  taskTitle: string
  recurringCount?: number
}

export default function RecurringDeleteModal({ 
  open, 
  onClose, 
  onDeleteSingle, 
  onDeleteAll, 
  taskTitle,
  recurringCount = 0
}: Props) {
  const { t } = useSafeTranslation()
  const { createStandardFooter } = useModalActions()

  return (
    <UnifiedModal
      size="md"
      open={open}
      onClose={onClose}
      title={t('tasks.deleteRecurring') || 'Удалить повторяющуюся задачу'}
      variant="center"
      footer={createStandardFooter(
        { 
          label: t('actions.cancel') || 'Отмена', 
          onClick: onClose
        }
      )}
    >
      <div className="space-y-6">
        {/* Warning message */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <AlertTriangle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">
              {t('tasks.deleteRecurringWarning') || 'Это повторяющаяся задача'}
            </p>
            <p>
              {t('tasks.deleteRecurringDescription', { 
                title: taskTitle,
                count: recurringCount 
              }) || `Задача "${taskTitle}" имеет ${recurringCount} повторений. Что вы хотите сделать?`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {/* Delete single task */}
          <button
            onClick={onDeleteSingle}
            className="w-full flex items-center gap-4 p-4 text-left border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {t('tasks.deleteSingle') || 'Удалить только эту задачу'}
              </p>
              <p className="text-sm text-gray-600">
                {t('tasks.deleteSingleDescription') || 'Остальные повторения останутся'}
              </p>
            </div>
          </button>

          {/* Delete all recurring tasks */}
          <button
            onClick={onDeleteAll}
            className="w-full flex items-center gap-4 p-4 text-left border border-red-200 rounded-xl hover:bg-red-50 transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-red-900">
                {t('tasks.deleteAllRecurring') || 'Удалить все повторения'}
              </p>
              <p className="text-sm text-red-600">
                {t('tasks.deleteAllDescription', { count: recurringCount }) || 
                  `Будут удалены все ${recurringCount} повторений этой задачи`}
              </p>
            </div>
          </button>
        </div>
      </div>
    </UnifiedModal>
  )
}
