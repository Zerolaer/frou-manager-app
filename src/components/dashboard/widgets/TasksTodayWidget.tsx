import React, { useState, useEffect } from 'react';
import { CalendarCheck, CheckCircle, Circle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import WidgetHeader from './WidgetHeader';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  date: string;
}

const TasksTodayWidget = () => {
  const { userId } = useSupabaseAuth();
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
        console.error('Error loading today tasks:', error);
        setTasks([]);
      } else {
        setTasks(data || []);
      }
    } catch (error) {
      console.error('Error loading today tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-gray-900 bg-gray-100';
      case 'medium': return 'text-gray-700 bg-gray-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      case 'normal': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const completedTasks = tasks.filter(task => task.status === 'closed').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="h-full flex flex-col">
      <WidgetHeader
        icon={<CalendarCheck className="w-5 h-5" />}
        title="Задачи на сегодня"
        subtitle="Показывает задачи на сегодня"
      />

      <div className="flex-1 p-6 flex flex-col">
        {/* Прогресс */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {completedTasks} из {totalTasks} выполнено
            </span>
            <span className="text-sm font-medium text-gray-900">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-black h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Список задач */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Нет задач на сегодня</p>
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
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Normal'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {tasks.length > 5 && (
          <div className="mt-2 text-center">
            <span className="text-xs text-gray-500">
              и еще {tasks.length - 5} задач
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksTodayWidget;
