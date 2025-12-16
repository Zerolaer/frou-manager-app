/* src/pages/Habits.tsx */
import React, { useEffect, useState, useCallback } from 'react';
import { useSafeTranslation } from '@/utils/safeTranslation';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { logger } from '@/lib/monitoring';
import HabitCard from '@/components/habits/HabitCard';
import HabitModal from '@/components/habits/HabitModal';
import { 
  listHabits, 
  createHabit, 
  updateHabit, 
  deleteHabit, 
  getHabitStats,
  markHabitComplete,
  addProgressValue
} from '@/features/habits/api';
import type { Habit, HabitWithStats } from '@/types/habits';
import { format } from 'date-fns';

export default function Habits() {
  const { t } = useSafeTranslation();
  const { userId } = useSupabaseAuth();
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Listen for SubHeader actions
  useEffect(() => {
    const handleSubHeaderAction = (event: CustomEvent) => {
      if (event.detail === 'add-habit') {
        setEditingHabit(null);
        setModalOpen(true);
      }
    };
    
    window.addEventListener('subheader-action', handleSubHeaderAction as EventListener);
    return () => {
      window.removeEventListener('subheader-action', handleSubHeaderAction as EventListener);
    };
  }, []);

  // Load habits
  const loadHabits = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const habitsList = await listHabits(userId);
      
      // Calculate stats for each habit
      const habitsWithStats = await Promise.all(
        habitsList.map(habit => getHabitStats(habit))
      );
      
      setHabits(habitsWithStats);
    } catch (error) {
      logger.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // Handle save (create or update)
  const handleSave = useCallback(async (habitData: Partial<Habit>) => {
    if (!userId) return;
    
    try {
      if (editingHabit) {
        await updateHabit(editingHabit.id, { ...habitData, user_id: userId });
        logger.debug('Habit updated', { id: editingHabit.id });
      } else {
        await createHabit({ ...habitData, user_id: userId });
        logger.debug('Habit created');
      }
      
      await loadHabits();
      setModalOpen(false);
      setEditingHabit(null);
    } catch (error) {
      logger.error('Error saving habit:', error);
    }
  }, [userId, editingHabit, loadHabits]);

  // Handle delete
  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm(t('habits.deleteConfirm') || 'Вы уверены, что хотите удалить эту привычку?')) return;
    
    try {
      await deleteHabit(id);
      await loadHabits();
      logger.debug('Habit deleted', { id });
    } catch (error) {
      logger.error('Error deleting habit:', error);
    }
  }, [loadHabits, t]);

  // Handle complete (for manual type)
  const handleComplete = useCallback(async (habitId: string) => {
    try {
      await markHabitComplete(habitId);
      await loadHabits();
    } catch (error) {
      logger.error('Error marking habit complete:', error);
    }
  }, [loadHabits]);

  // Handle add progress (for progress type)
  const handleAddProgress = useCallback(async (habitId: string, value: number) => {
    try {
      await addProgressValue(habitId, value);
      await loadHabits();
    } catch (error) {
      logger.error('Error adding progress:', error);
    }
  }, [loadHabits]);

  // Handle edit
  const handleEdit = useCallback((habit: HabitWithStats) => {
    setEditingHabit(habit);
    setModalOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        {habits.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">{t('habits.noHabits')}</p>
            <p className="text-sm text-gray-400">{t('habits.createFirst')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {habits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onEdit={() => handleEdit(habit)}
                onDelete={() => handleDelete(habit.id)}
                onComplete={() => handleComplete(habit.id)}
                onAddProgress={(value) => handleAddProgress(habit.id, value)}
              />
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <HabitModal
          open={modalOpen}
          habit={editingHabit}
          onClose={() => {
            setModalOpen(false);
            setEditingHabit(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
