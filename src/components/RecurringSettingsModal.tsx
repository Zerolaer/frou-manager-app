import React, { useState, useEffect } from 'react'
import { Repeat } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { RecurringTaskSettings, RecurrenceType } from '@/types/recurring'
import { format } from 'date-fns'
import Dropdown from '@/components/ui/Dropdown'
import { CoreInput } from '@/components/ui/CoreInput'

type Props = {
  open: boolean
  onClose: () => void
  onSave: (settings: RecurringTaskSettings) => void
  currentSettings?: RecurringTaskSettings
  taskTitle?: string
}

export default function RecurringEditModal({ open, onClose, onSave, currentSettings, taskTitle }: Props) {
  const { t } = useSafeTranslation()
  const { createStandardFooter } = useModalActions()
  const [settings, setSettings] = useState<RecurringTaskSettings>({
    isRecurring: true,
    recurrenceType: 'daily',
    interval: 1,
    dayOfWeek: undefined,
    dayOfMonth: undefined,
    endDate: undefined
  })

  // Initialize settings when modal opens
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('RecurringSettingsModal useEffect:', { open, currentSettings })
    }
    if (open && currentSettings) {
      if (import.meta.env.DEV) console.log('Setting settings from currentSettings:', currentSettings)
      setSettings(currentSettings)
    } else if (open) {
      if (import.meta.env.DEV) console.log('Setting default settings')
      // Default settings for new recurring task
      setSettings({
        isRecurring: true,
        recurrenceType: 'daily',
        interval: 1,
        dayOfWeek: undefined,
        dayOfMonth: undefined,
        endDate: undefined
      })
    }
  }, [open, currentSettings])

  const RECURRENCE_TYPES = [
    { value: 'daily', label: t('tasks.recurring.daily') || 'Ежедневно' },
    { value: 'weekly', label: t('tasks.recurring.weekly') || 'Еженедельно' },
    { value: 'monthly', label: t('tasks.recurring.monthly') || 'Ежемесячно' },
    { value: 'yearly', label: t('tasks.recurring.yearly') || 'Ежегодно' }
  ]

  const WEEKDAYS = [
    { value: 1, label: t('tasks.recurring.monday') || 'Понедельник' },
    { value: 2, label: t('tasks.recurring.tuesday') || 'Вторник' },
    { value: 3, label: t('tasks.recurring.wednesday') || 'Среда' },
    { value: 4, label: t('tasks.recurring.thursday') || 'Четверг' },
    { value: 5, label: t('tasks.recurring.friday') || 'Пятница' },
    { value: 6, label: t('tasks.recurring.saturday') || 'Суббота' },
    { value: 0, label: t('tasks.recurring.sunday') || 'Воскресенье' }
  ]

  const MONTHS = [
    { value: 1, label: t('tasks.recurring.january') || 'Январь' },
    { value: 2, label: t('tasks.recurring.february') || 'Февраль' },
    { value: 3, label: t('tasks.recurring.march') || 'Март' },
    { value: 4, label: t('tasks.recurring.april') || 'Апрель' },
    { value: 5, label: t('tasks.recurring.may') || 'Май' },
    { value: 6, label: t('tasks.recurring.june') || 'Июнь' },
    { value: 7, label: t('tasks.recurring.july') || 'Июль' },
    { value: 8, label: t('tasks.recurring.august') || 'Август' },
    { value: 9, label: t('tasks.recurring.september') || 'Сентябрь' },
    { value: 10, label: t('tasks.recurring.october') || 'Октябрь' },
    { value: 11, label: t('tasks.recurring.november') || 'Ноябрь' },
    { value: 12, label: t('tasks.recurring.december') || 'Декабрь' }
  ]

  const updateSettings = (newSettings: Partial<RecurringTaskSettings>) => {
    const updated = { ...settings, ...newSettings }
    
    // Clear dependent fields when recurrence type changes
    if (newSettings.recurrenceType) {
      if (newSettings.recurrenceType !== 'weekly') {
        updated.dayOfWeek = undefined
      }
      if (newSettings.recurrenceType !== 'monthly') {
        updated.dayOfMonth = undefined
      }
    }
    
    setSettings(updated)
  }

  const handleSave = () => {
    onSave(settings)
    onClose()
  }

  return (
    <UnifiedModal
      size="lg"
      open={open}
      onClose={onClose}
      title={t('tasks.recurring.editSettings') || 'Настройки повторения'}
      subtitle={taskTitle && `"${taskTitle}"`}
      variant="center"
      footer={createStandardFooter(
        { 
          label: t('common.save') || 'Сохранить', 
          onClick: handleSave, 
          variant: 'primary' 
        },
        { 
          label: t('common.cancel') || 'Отмена', 
          onClick: onClose, 
          variant: 'secondary' 
        }
      )}
    >
      <div className="space-y-6">
        {/* Recurrence Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('tasks.recurring.repeat') || 'Повторять'}
          </label>
          <Dropdown
            options={RECURRENCE_TYPES}
            value={settings.recurrenceType}
            onChange={(value) => updateSettings({ recurrenceType: value as RecurrenceType })}
            placeholder={t('tasks.recurring.repeat') || 'Повторять'}
            buttonClassName="w-full"
          />
        </div>

        {/* Interval */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('tasks.recurring.every') || 'Каждый'}
          </label>
          <div className="flex items-center gap-2">
            <CoreInput
              type="number"
              min="1"
              max="31"
              value={settings.interval.toString()}
              onChange={(value) => updateSettings({ interval: parseInt(value) || 1 })}
              className="w-20"
            />
            <span className="text-sm text-gray-600">
              {settings.recurrenceType === 'daily' && (t('tasks.recurring.day') || 'день')}
              {settings.recurrenceType === 'weekly' && (t('tasks.recurring.week') || 'неделя')}
              {settings.recurrenceType === 'monthly' && (t('tasks.recurring.month') || 'месяц')}
              {settings.recurrenceType === 'yearly' && (t('tasks.recurring.year') || 'год')}
            </span>
          </div>
        </div>

        {/* Day of Week (for weekly) */}
        {settings.recurrenceType === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.recurring.dayOfWeek') || 'День недели'}
            </label>
            <Dropdown
              options={WEEKDAYS}
              value={settings.dayOfWeek?.toString() || ''}
              onChange={(value) => updateSettings({ dayOfWeek: value ? parseInt(value) : undefined })}
              placeholder={t('tasks.recurring.selectDay') || 'Выберите день'}
              buttonClassName="w-full"
            />
          </div>
        )}

        {/* Day of Month (for monthly) */}
        {settings.recurrenceType === 'monthly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.recurring.dayOfMonth') || 'День месяца'}
            </label>
            <CoreInput
              type="number"
              min="1"
              max="31"
              value={settings.dayOfMonth?.toString() || ''}
              onChange={(value) => updateSettings({ dayOfMonth: value ? parseInt(value) : undefined })}
              className="w-full"
              placeholder={t('tasks.recurring.selectDay') || 'Выберите день'}
            />
          </div>
        )}

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('tasks.recurring.endDate') || 'Дата окончания'} {t('tasks.recurring.optional') && `(${t('tasks.recurring.optional')})`}
          </label>
          <input
            type="date"
            value={(() => {
              if (import.meta.env.DEV) {
                console.log('Date input value calculation:', {
                  endDate: settings.endDate,
                  isDate: settings.endDate instanceof Date,
                  isValid: settings.endDate && !isNaN(settings.endDate.getTime()),
                  formatted: settings.endDate && settings.endDate instanceof Date && !isNaN(settings.endDate.getTime()) ? format(settings.endDate, 'yyyy-MM-dd') : ''
                })
              }
              return settings.endDate && settings.endDate instanceof Date && !isNaN(settings.endDate.getTime()) ? format(settings.endDate, 'yyyy-MM-dd') : ''
            })()}
            onChange={(e) => updateSettings({ endDate: e.target.value ? new Date(e.target.value) : undefined })}
            className="w-full inline-flex items-center px-4 py-2.5 rounded-xl bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 border outline-none"
            style={{ borderColor: '#E5E7EB' }}
          />
        </div>
      </div>
    </UnifiedModal>
  )
}