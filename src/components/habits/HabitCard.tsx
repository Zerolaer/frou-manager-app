/* src/components/habits/HabitCard.tsx */
import React, { useState, useRef, useEffect } from 'react';
import { useSafeTranslation } from '@/utils/safeTranslation';
import { MoreVertical, Check, Plus, TrendingUp } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import type { HabitWithStats } from '@/types/habits';
import CoreMenu from '@/components/ui/CoreMenu';
import { CoreInput } from '@/components/ui/CoreInput';

type Props = {
  habit: HabitWithStats;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onAddProgress: (value: number) => void;
};

export default function HabitCard({ habit, onEdit, onDelete, onComplete, onAddProgress }: Props) {
  const { t } = useSafeTranslation();
  const [showProgressInput, setShowProgressInput] = useState(false);
  const [progressValue, setProgressValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  // Check if completed today (for manual type)
  const isCompletedToday = habit.type === 'manual' && habit.last_completion_date 
    ? isSameDay(parseISO(habit.last_completion_date), new Date())
    : false;

  const handleAddProgressClick = () => {
    if (showProgressInput) {
      const value = parseFloat(progressValue);
      if (!isNaN(value) && value > 0) {
        onAddProgress(value);
        setProgressValue('');
        setShowProgressInput(false);
      }
    } else {
      setShowProgressInput(true);
    }
  };

  const getTypeColor = () => {
    switch (habit.type) {
      case 'automatic':
        return 'bg-blue-50 border-blue-200';
      case 'manual':
        return 'bg-green-50 border-green-200';
      case 'progress':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTypeLabel = () => {
    switch (habit.type) {
      case 'automatic':
        return t('habits.type.automatic');
      case 'manual':
        return t('habits.type.manual');
      case 'progress':
        return t('habits.type.progress');
      default:
        return '';
    }
  };

  return (
    <div className={`rounded-xl border-2 p-4 ${getTypeColor()} transition-all hover:shadow-md`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{habit.title}</h3>
          <span className="text-xs text-gray-600">{getTypeLabel()}</span>
        </div>
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-lg hover:bg-white/50 transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10">
              <CoreMenu
                options={[
                  { value: 'edit', label: t('habits.editHabit') },
                  { value: 'delete', label: t('habits.deleteHabit'), destructive: true },
                ]}
                onSelect={(value) => {
                  if (value === 'edit') onEdit();
                  if (value === 'delete') onDelete();
                  setMenuOpen(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats based on type */}
      <div className="space-y-2 mb-4">
        {habit.type === 'automatic' && (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">
              {habit.days_count || 0} {t('habits.daysSinceStart')}
            </span>
          </div>
        )}

        {habit.type === 'manual' && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-900">
                {habit.completion_count || 0} {t('habits.completions')}
              </span>
            </div>
            {habit.streak_days !== undefined && habit.streak_days > 0 && (
              <div className="text-xs text-gray-600">
                🔥 {habit.streak_days} {t('habits.streak')}
              </div>
            )}
            {isCompletedToday && (
              <div className="text-xs text-green-600 font-medium">
                ✓ {t('habits.completedToday')}
              </div>
            )}
          </div>
        )}

        {habit.type === 'progress' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {habit.current_value || 0} / {habit.target_value || 0}
              </span>
              {habit.progress_percentage !== undefined && (
                <span className="font-medium text-gray-900">
                  {Math.round(habit.progress_percentage)}%
                </span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${habit.progress_percentage || 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {habit.type === 'manual' && (
          <button
            onClick={onComplete}
            disabled={isCompletedToday}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isCompletedToday
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isCompletedToday ? t('habits.alreadyCompleted') : t('habits.complete')}
          </button>
        )}

        {habit.type === 'progress' && (
          <div className="flex-1 space-y-2">
            {showProgressInput ? (
              <div className="flex gap-2">
                <CoreInput
                  type="number"
                  value={progressValue}
                  onChange={(e) => setProgressValue(e.target.value)}
                  placeholder={t('habits.enterValue')}
                  className="flex-1"
                />
                <button
                  onClick={handleAddProgressClick}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowProgressInput(true)}
                className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                {t('habits.addValue')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Date info */}
      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
        {t('habits.startDate')}: {format(parseISO(habit.start_date), 'dd.MM.yyyy')}
        {habit.end_date && (
          <> • {t('habits.endDate')}: {format(parseISO(habit.end_date), 'dd.MM.yyyy')}</>
        )}
      </div>
    </div>
  );
}
