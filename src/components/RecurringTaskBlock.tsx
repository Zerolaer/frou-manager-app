import React, { useState, useEffect } from 'react'
import { Repeat, Edit3, Calendar } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { RecurringTaskSettings } from '@/types/recurring'
import { getRecurrenceDescription as getRecurrenceDescriptionUtil } from '@/utils/recurringUtils'
import RecurringEditModal from './RecurringSettingsModal'
import { supabase } from '@/lib/supabaseClient'

type Task = {
  id: string
  title: string
  recurring_task_id?: string | null
}

type Props = {
  task: Task
  onUpdateRecurrence: (taskId: string, settings: RecurringTaskSettings) => void
}

export default function RecurringTaskBlock({ task, onUpdateRecurrence }: Props) {
  const { t } = useSafeTranslation()
  const [showEditModal, setShowEditModal] = useState(false)
  const [recurringSettings, setRecurringSettings] = useState<RecurringTaskSettings | null>(null)
  const [loading, setLoading] = useState(false)

  if (!task.recurring_task_id) {
    return null
  }

  // Load recurring settings from database
  useEffect(() => {
    const loadRecurringSettings = async () => {
      if (!task.recurring_task_id) return
      
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('recurring_tasks')
          .select('*')
          .eq('id', task.recurring_task_id)
          .single()

        if (error) {
          console.error('Error loading recurring settings:', error)
          return
        }

        if (data) {
          if (import.meta.env.DEV) {
            console.log('Loaded recurring data:', data)
            console.log('end_date from DB:', data.end_date, 'type:', typeof data.end_date)
          }
          
          const settings: RecurringTaskSettings = {
            isRecurring: true,
            recurrenceType: data.recurrence_type,
            interval: data.recurrence_interval,
            dayOfWeek: data.recurrence_day_of_week,
            dayOfMonth: data.recurrence_day_of_month,
            endDate: data.end_date ? (() => {
              const date = new Date(data.end_date)
              if (import.meta.env.DEV) console.log('Created date from end_date:', date, 'isValid:', !isNaN(date.getTime()))
              return isNaN(date.getTime()) ? undefined : date
            })() : undefined
          }
          if (import.meta.env.DEV) console.log('Final settings with endDate:', settings)
          setRecurringSettings(settings)
        }
      } catch (error) {
        console.error('Error loading recurring settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRecurringSettings()
  }, [task.recurring_task_id])

  // Get current recurrence description
  const getCurrentRecurrenceDescription = () => {
    if (loading) {
      return t('common.loading') || 'Загрузка...'
    }
    
    if (recurringSettings && recurringSettings.recurrenceType) {
      return getRecurrenceDescriptionUtil(
        recurringSettings.recurrenceType,
        recurringSettings.interval,
        recurringSettings.dayOfWeek,
        recurringSettings.dayOfMonth
      )
    }
    
    return t('tasks.recurring.active') || 'Активно'
  }

  const handleEditRecurrence = () => {
    setShowEditModal(true)
  }

  const handleSaveRecurrence = (settings: RecurringTaskSettings) => {
    onUpdateRecurrence(task.id, settings)
    setShowEditModal(false)
  }

  return (
    <>
      <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 mx-6">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700">
            {t('tasks.recurring.title') || 'Повторяющаяся задача'}
          </div>
          <button
            onClick={handleEditRecurrence}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors group"
            title={t('tasks.recurring.editSettings') || 'Настроить повторение'}
          >
            <Edit3 className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-3.5 h-3.5" />
            <span>{getCurrentRecurrenceDescription()}</span>
          </div>
          
          <div className="text-xs text-gray-500">
            {t('tasks.recurring.editHint') || 'Нажмите на иконку редактирования, чтобы изменить настройки повторения'}
          </div>
        </div>
      </section>

      <RecurringEditModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveRecurrence}
        currentSettings={recurringSettings || undefined}
        taskTitle={task.title}
      />
    </>
  )
}
