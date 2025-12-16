/* src/components/habits/HabitModal.tsx */
import React, { useEffect, useState } from 'react';
import { useSafeTranslation } from '@/utils/safeTranslation';
import SideModal from '@/components/ui/SideModal';
import { ModalButton } from '@/components/ui/ModalSystem';
import { CoreInput } from '@/components/ui/CoreInput';
import { format } from 'date-fns';
import type { Habit, HabitType } from '@/types/habits';

type Props = {
  open: boolean;
  habit: Habit | null;
  onClose: () => void;
  onSave: (habit: Partial<Habit>) => Promise<void>;
};

export default function HabitModal({ open, habit, onClose, onSave }: Props) {
  const { t } = useSafeTranslation();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<HabitType>('manual');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [initialValue, setInitialValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Load habit data when modal opens
  useEffect(() => {
    if (open) {
      if (habit) {
        setTitle(habit.title);
        setType(habit.type);
        setStartDate(habit.start_date);
        setEndDate(habit.end_date || '');
        setInitialValue(habit.initial_value?.toString() || '');
        setTargetValue(habit.target_value?.toString() || '');
      } else {
        // Reset to defaults for new habit
        setTitle('');
        setType('manual');
        setStartDate(format(new Date(), 'yyyy-MM-dd'));
        setEndDate('');
        setInitialValue('');
        setTargetValue('');
      }
    }
  }, [open, habit]);

  const handleSave = async () => {
    if (!title.trim()) return;

    setSaving(true);
    try {
      const habitData: Partial<Habit> = {
        title: title.trim(),
        type,
        start_date: startDate,
        end_date: endDate || null,
      };

      // Add progress-specific fields
      if (type === 'progress') {
        habitData.initial_value = initialValue ? parseFloat(initialValue) : 0;
        habitData.target_value = targetValue ? parseFloat(targetValue) : null;
        habitData.current_value = initialValue ? parseFloat(initialValue) : 0;
      }

      await onSave(habitData);
    } catch (error) {
      // Error is logged in onSave handler in Habits.tsx
    } finally {
      setSaving(false);
    }
  };

  return (
    <SideModal
      open={open}
      onClose={onClose}
      title={habit ? t('habits.editHabit') : t('habits.newHabit')}
      footer={
        <div className="flex gap-3">
          <ModalButton variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={!title.trim()}
          >
            {t('actions.save')}
          </ModalButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('habits.title')}
          </label>
          <CoreInput
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('habits.titlePlaceholder')}
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('habits.type.label')}
          </label>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="type"
                value="automatic"
                checked={type === 'automatic'}
                onChange={(e) => setType(e.target.value as HabitType)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">{t('habits.type.automatic')}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('habits.type.automaticDescription')}
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="type"
                value="manual"
                checked={type === 'manual'}
                onChange={(e) => setType(e.target.value as HabitType)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">{t('habits.type.manual')}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('habits.type.manualDescription')}
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="type"
                value="progress"
                checked={type === 'progress'}
                onChange={(e) => setType(e.target.value as HabitType)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">{t('habits.type.progress')}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('habits.type.progressDescription')}
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('habits.startDate')}
          </label>
          <CoreInput
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        {/* End Date (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('habits.endDate')}
          </label>
          <CoreInput
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">{t('habits.endDate')}</p>
        </div>

        {/* Progress-specific fields */}
        {type === 'progress' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('habits.initialValue')}
              </label>
              <CoreInput
                type="number"
                value={initialValue}
                onChange={(e) => setInitialValue(e.target.value)}
                placeholder="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('habits.finalValue')}
              </label>
              <CoreInput
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="0"
                step="0.01"
              />
            </div>
          </>
        )}
      </div>
    </SideModal>
  );
}
