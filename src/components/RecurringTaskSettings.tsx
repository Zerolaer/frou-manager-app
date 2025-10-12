import React, { useState, useEffect } from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { RecurringTaskSettings as RecurringSettings, RecurrenceType } from '@/types/recurring'
import { getRecurrenceDescription, validateRecurrenceSettings } from '@/utils/recurringUtils'
import { Calendar, Repeat, X } from 'lucide-react'
import Dropdown, { DropdownOption } from './ui/Dropdown'
import { CoreInput } from './ui/CoreInput'

interface Props {
  settings: RecurringSettings
  onChange: (settings: RecurringSettings) => void
  startDate: string
}

// These will be created inside the component to access translations

export default function RecurringTaskSettings({ settings, onChange, startDate }: Props) {
  const { t } = useSafeTranslation()
  const [localSettings, setLocalSettings] = useState<RecurringSettings>(settings)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Dynamic arrays with translations
  const RECURRENCE_TYPES: { value: RecurrenceType; label: string }[] = [
    { value: 'daily', label: t('tasks.recurring.daily') || 'Daily' },
    { value: 'weekly', label: t('tasks.recurring.weekly') || 'Weekly' },
    { value: 'monthly', label: t('tasks.recurring.monthly') || 'Monthly' },
    { value: 'yearly', label: t('tasks.recurring.yearly') || 'Yearly' }
  ]

  const WEEKDAYS = [
    { value: 0, label: t('tasks.recurring.sunday') || 'Sunday' },
    { value: 1, label: t('tasks.recurring.monday') || 'Monday' },
    { value: 2, label: t('tasks.recurring.tuesday') || 'Tuesday' },
    { value: 3, label: t('tasks.recurring.wednesday') || 'Wednesday' },
    { value: 4, label: t('tasks.recurring.thursday') || 'Thursday' },
    { value: 5, label: t('tasks.recurring.friday') || 'Friday' },
    { value: 6, label: t('tasks.recurring.saturday') || 'Saturday' }
  ]

  const MONTHS = [
    { value: 1, label: t('tasks.recurring.january') || 'January' },
    { value: 2, label: t('tasks.recurring.february') || 'February' },
    { value: 3, label: t('tasks.recurring.march') || 'March' },
    { value: 4, label: t('tasks.recurring.april') || 'April' },
    { value: 5, label: t('tasks.recurring.may') || 'May' },
    { value: 6, label: t('tasks.recurring.june') || 'June' },
    { value: 7, label: t('tasks.recurring.july') || 'July' },
    { value: 8, label: t('tasks.recurring.august') || 'August' },
    { value: 9, label: t('tasks.recurring.september') || 'September' },
    { value: 10, label: t('tasks.recurring.october') || 'October' },
    { value: 11, label: t('tasks.recurring.november') || 'November' },
    { value: 12, label: t('tasks.recurring.december') || 'December' }
  ]

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const updateSettings = (updates: Partial<RecurringSettings>) => {
    const newSettings = { ...localSettings, ...updates }
    setLocalSettings(newSettings)
    
    // Validate settings
    if (newSettings.isRecurring && newSettings.recurrenceType) {
      const validation = validateRecurrenceSettings({
        type: newSettings.recurrenceType,
        interval: newSettings.recurrenceInterval || 1,
        dayOfWeek: newSettings.recurrenceDayOfWeek,
        dayOfMonth: newSettings.recurrenceDayOfMonth,
        monthOfYear: newSettings.recurrenceMonthOfYear,
        endDate: newSettings.endDate || undefined
      })
      
      if (validation.isValid) {
        setValidationError(null)
        onChange(newSettings)
      } else {
        setValidationError(validation.error || null)
      }
    } else {
      setValidationError(null)
      onChange(newSettings)
    }
  }

  const handleToggleRecurring = () => {
    const newIsRecurring = !localSettings.isRecurring
    if (newIsRecurring) {
      updateSettings({
        isRecurring: true,
        recurrenceType: 'daily',
        recurrenceInterval: 1
      })
    } else {
      updateSettings({
        isRecurring: false,
        recurrenceType: undefined,
        recurrenceInterval: undefined,
        recurrenceDayOfWeek: undefined,
        recurrenceDayOfMonth: undefined,
        recurrenceMonthOfYear: undefined,
        endDate: undefined
      })
    }
  }

  const getDescription = () => {
    if (!localSettings.isRecurring || !localSettings.recurrenceType) return ''
    
    return getRecurrenceDescription(
      localSettings.recurrenceType,
      localSettings.recurrenceInterval || 1,
      localSettings.recurrenceDayOfWeek,
      localSettings.recurrenceDayOfMonth,
      localSettings.recurrenceMonthOfYear
    )
  }

  if (!localSettings.isRecurring) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleToggleRecurring}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Repeat className="w-4 h-4" />
          <span>{t('tasks.recurring.title') || 'Make recurring'}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-gray-900" />
          <span className="text-sm font-medium text-gray-900">{t('tasks.recurring.title') || 'Recurring Task'}</span>
        </div>
        <button
          type="button"
          onClick={handleToggleRecurring}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {validationError && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {validationError}
        </div>
      )}

      <div className="space-y-3">
        {/* Recurrence Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
{t('tasks.recurring.repeat') || 'Repeat'}
          </label>
          <Dropdown
            options={RECURRENCE_TYPES.map(type => ({ value: type.value, label: type.label }))}
            value={localSettings.recurrenceType || 'daily'}
            onChange={(value) => updateSettings({ recurrenceType: String(value) as RecurrenceType })}
            buttonClassName="w-full"
          />
        </div>

        {/* Interval */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
{t('tasks.recurring.every') || 'Every'}
          </label>
          <CoreInput
            type="number"
            min="1"
            max="999"
            value={String(localSettings.recurrenceInterval || 1)}
            onChange={(e) => updateSettings({ recurrenceInterval: parseInt(e.target.value) || 1 })}
          />
        </div>

        {/* Type-specific settings */}
        {localSettings.recurrenceType === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
{t('tasks.recurring.dayOfWeek') || 'Day of week'}
            </label>
            <Dropdown
              options={WEEKDAYS.map(day => ({ value: day.value, label: day.label }))}
              value={localSettings.recurrenceDayOfWeek || 1}
              onChange={(value) => updateSettings({ recurrenceDayOfWeek: Number(value) })}
              buttonClassName="w-full"
            />
          </div>
        )}

        {localSettings.recurrenceType === 'monthly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
{t('tasks.recurring.dayOfMonth') || 'Day of month'}
            </label>
            <CoreInput
              type="number"
              min="1"
              max="31"
              value={String(localSettings.recurrenceDayOfMonth || new Date(startDate).getDate())}
              onChange={(e) => updateSettings({ recurrenceDayOfMonth: parseInt(e.target.value) })}
            />
          </div>
        )}

        {localSettings.recurrenceType === 'yearly' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
{t('tasks.recurring.month') || 'Month'}
              </label>
              <Dropdown
                options={MONTHS.map(month => ({ value: month.value, label: month.label }))}
                value={localSettings.recurrenceMonthOfYear || new Date(startDate).getMonth() + 1}
                onChange={(value) => updateSettings({ recurrenceMonthOfYear: Number(value) })}
                buttonClassName="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
{t('tasks.recurring.day') || 'Day'}
              </label>
              <CoreInput
                type="number"
                min="1"
                max="31"
                value={String(localSettings.recurrenceDayOfMonth || new Date(startDate).getDate())}
                onChange={(e) => updateSettings({ recurrenceDayOfMonth: parseInt(e.target.value) })}
              />
            </div>
          </div>
        )}

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
{t('tasks.recurring.endDate') || 'End date (optional)'}
          </label>
          <CoreInput
            type="date"
            value={localSettings.endDate || ''}
            onChange={(e) => updateSettings({ endDate: e.target.value || undefined })}
          />
        </div>

        {/* Description */}
        <div className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
          <strong>{t('tasks.recurring.schedule') || 'Schedule'}:</strong> {getDescription()}
        </div>
      </div>
    </div>
  )
}
