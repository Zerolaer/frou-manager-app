import React, { useState, useEffect } from 'react';
import { CalendarCheck, CheckCircle, Circle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useSafeTranslation } from '@/utils/safeTranslation';
import WidgetHeader from './WidgetHeader';
import { getPriorityText } from '@/lib/taskHelpers';
import { logger } from '@/lib/monitoring';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  date: string;
}

const TasksTodayWidget = () => {
  const { userId } = useSupabaseAuth();
  const { t } = useSafeTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    loadTodayTasks();
  }, [userId]);

  const loadTodayTasks = async () => {
    try {
      setLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('tasks_items')
        .select('id, title, status, priority, date')
        .eq('date', today)
        .order('position', { ascending: true });

      if (error) {
        logger.error('Error loading today tasks:', error);
        setTasks([]);
      } else {
        setTasks(data || []);
      }
    } catch (error) {
      logger.error('Error loading today tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const completedTasks = tasks.filter(task => task.status === 'closed').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="h-full flex flex-col">
      <WidgetHeader
        icon={<CalendarCheck className="w-5 h-5" />}
        title={t('dashboard.tasksToday') || 'Tasks Today'}
        subtitle={t('dashboard.tasksToday') || 'Tasks Today'}
      />

      <div className="flex-1 p-6 flex flex-col">
        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {completedTasks} {t('common.of') || 'of'} {totalTasks} {t('dashboard.completedTasks') || 'completed tasks'}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-black h-2 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Tasks list */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">{t('dashboard.noTasks') || 'No tasks for today'}</p>
            </div>
          ) : (
            tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {task.status === 'closed' ? (
                    <CheckCircle className="w-5 h-5 text-gray-900" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${task.status === 'closed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {task.title}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className="px-2 py-1 rounded-full text-xs font-medium text-gray-900 bg-gray-100">
                    {getPriorityText(task.priority) || 'Normal'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {tasks.length > 5 && (
          <div className="mt-2 text-center">
            <span className="text-xs text-gray-500">
              and {tasks.length - 5} more tasks
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksTodayWidget;
