/* src/features/habits/api.ts */
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/monitoring';
import type { Habit, HabitEntry, HabitWithStats } from '@/types/habits';
import { differenceInDays, format, parseISO, startOfDay } from 'date-fns';

// Получить все привычки пользователя
export async function listHabits(userId: string): Promise<Habit[]> {
  try {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error listing habits:', error);
      throw error;
    }

    return (data || []) as Habit[];
  } catch (error) {
    logger.error('Error listing habits:', error);
    throw error;
  }
}

// Создать привычку
export async function createHabit(payload: Partial<Habit>): Promise<Habit> {
  try {
    const { data, error } = await supabase
      .from('habits')
      .insert({
        title: payload.title ?? '',
        type: payload.type ?? 'manual',
        start_date: payload.start_date ?? format(new Date(), 'yyyy-MM-dd'),
        end_date: payload.end_date || null,
        initial_value: payload.initial_value ?? 0,
        target_value: payload.target_value || null,
        current_value: payload.initial_value ?? 0,
        user_id: payload.user_id
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating habit:', error);
      throw error;
    }

    logger.debug('Habit created', { id: data.id });
    return data as Habit;
  } catch (error) {
    logger.error('Error creating habit:', error);
    throw error;
  }
}

// Обновить привычку
export async function updateHabit(id: string, changes: Partial<Habit>): Promise<Habit> {
  try {
    const { data, error } = await supabase
      .from('habits')
      .update(changes)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating habit:', error);
      throw error;
    }

    logger.debug('Habit updated', { id });
    return data as Habit;
  } catch (error) {
    logger.error('Error updating habit:', error);
    throw error;
  }
}

// Удалить привычку
export async function deleteHabit(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting habit:', error);
      throw error;
    }

    logger.debug('Habit deleted', { id });
  } catch (error) {
    logger.error('Error deleting habit:', error);
    throw error;
  }
}

// Получить записи о выполнении привычки
export async function getHabitEntries(habitId: string): Promise<HabitEntry[]> {
  try {
    const { data, error } = await supabase
      .from('habit_entries')
      .select('*')
      .eq('habit_id', habitId)
      .order('date', { ascending: false });

    if (error) {
      logger.error('Error getting habit entries:', error);
      throw error;
    }

    return (data || []) as HabitEntry[];
  } catch (error) {
    logger.error('Error getting habit entries:', error);
    throw error;
  }
}

// Добавить запись о выполнении (для ручного типа)
export async function markHabitComplete(habitId: string, date?: string): Promise<HabitEntry> {
  try {
    const entryDate = date || format(new Date(), 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('habit_entries')
      .insert({
        habit_id: habitId,
        date: entryDate,
        value: null // Для ручного типа значение не нужно
      })
      .select()
      .single();

    if (error) {
      // Если запись уже существует, просто возвращаем её
      if (error.code === '23505') { // Unique violation
        const { data: existing } = await supabase
          .from('habit_entries')
          .select('*')
          .eq('habit_id', habitId)
          .eq('date', entryDate)
          .single();
        
        if (existing) return existing as HabitEntry;
      }
      logger.error('Error marking habit complete:', error);
      throw error;
    }

    logger.debug('Habit marked complete', { habitId, date: entryDate });
    return data as HabitEntry;
  } catch (error) {
    logger.error('Error marking habit complete:', error);
    throw error;
  }
}

// Добавить значение прогресса (для типа progress)
export async function addProgressValue(habitId: string, value: number, date?: string): Promise<HabitEntry> {
  try {
    const entryDate = date || format(new Date(), 'yyyy-MM-dd');
    
    // Сначала получаем текущее значение привычки
    const { data: habit } = await supabase
      .from('habits')
      .select('current_value')
      .eq('id', habitId)
      .single();

    const currentValue = (habit?.current_value as number) || 0;
    const newValue = currentValue + value;

    // Обновляем текущее значение в привычке
    await supabase
      .from('habits')
      .update({ current_value: newValue })
      .eq('id', habitId);

    // Добавляем запись
    const { data, error } = await supabase
      .from('habit_entries')
      .insert({
        habit_id: habitId,
        date: entryDate,
        value: value
      })
      .select()
      .single();

    if (error) {
      logger.error('Error adding progress value:', error);
      throw error;
    }

    logger.debug('Progress value added', { habitId, value, date: entryDate });
    return data as HabitEntry;
  } catch (error) {
    logger.error('Error adding progress value:', error);
    throw error;
  }
}

// Вычислить статистику для привычки
export async function getHabitStats(habit: Habit): Promise<HabitWithStats> {
  try {
    const entries = await getHabitEntries(habit.id);
    const startDate = parseISO(habit.start_date);
    const today = startOfDay(new Date());
    
    let stats: Partial<HabitWithStats> = {};

    if (habit.type === 'automatic') {
      // Считаем дни с даты начала
      const daysCount = differenceInDays(today, startDate);
      stats.days_count = Math.max(0, daysCount);
    } else if (habit.type === 'manual') {
      // Считаем количество выполнений
      stats.completion_count = entries.length;
      
      // Находим последнюю дату выполнения
      if (entries.length > 0) {
        const sortedEntries = entries.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        stats.last_completion_date = sortedEntries[0].date;
        
        // Вычисляем streak (последовательные дни с сегодня назад)
        let streak = 0;
        let checkDate = startOfDay(today);
        
        // Проверяем есть ли запись на сегодня
        const todayEntry = sortedEntries.find(e => 
          format(startOfDay(parseISO(e.date)), 'yyyy-MM-dd') === format(checkDate, 'yyyy-MM-dd')
        );
        
        if (todayEntry) {
          streak = 1;
          checkDate = new Date(checkDate);
          checkDate.setDate(checkDate.getDate() - 1);
          
          // Продолжаем проверять предыдущие дни последовательно
          while (true) {
            const checkDateStr = format(checkDate, 'yyyy-MM-dd');
            const entry = sortedEntries.find(e => 
              format(startOfDay(parseISO(e.date)), 'yyyy-MM-dd') === checkDateStr
            );
            
            if (entry) {
              streak++;
              checkDate = new Date(checkDate);
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              // Пропущен день - streak прерван
              break;
            }
          }
        }
        stats.streak_days = streak;
      } else {
        stats.last_completion_date = null;
        stats.streak_days = 0;
      }
    } else if (habit.type === 'progress') {
      // Вычисляем процент прогресса
      const current = habit.current_value || 0;
      const initial = habit.initial_value || 0;
      const target = habit.target_value;
      
      if (target !== null && target !== undefined) {
        const total = target - initial;
        const progress = current - initial;
        stats.progress_percentage = total > 0 ? Math.min(100, Math.max(0, (progress / total) * 100)) : 0;
      } else {
        stats.progress_percentage = 0;
      }
    }

    return { ...habit, ...stats } as HabitWithStats;
  } catch (error) {
    logger.error('Error getting habit stats:', error);
    return habit as HabitWithStats;
  }
}
