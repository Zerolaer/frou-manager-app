import React, { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import WidgetHeader from './WidgetHeader';

interface PriorityData {
  high: number;
  medium: number;
  low: number;
}

const PRIORITY_COLORS = {
  high: '#000000', // black
  medium: '#4B5563', // dark gray
  low: '#9CA3AF' // light gray
};

const PRIORITY_LABELS = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий'
};

const PrioritiesWidget = () => {
  const { userId } = useSupabaseAuth();
  const [priorities, setPriorities] = useState<PriorityData>({
    high: 4,
    medium: 2,
    low: 1
  });
  const [loading, setLoading] = useState(false);

  // Убираем загрузку данных - используем только тестовые
  // useEffect(() => {
  //   if (userId) {
  //     loadPrioritiesData();
  //   }
  // }, [userId]);

  const loadPrioritiesData = async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Правильный расчет дат для месяца
      const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const monthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]; // Последний день месяца

      // Получаем ВСЕ задачи пользователя (не только за месяц)
      const { data: tasksData } = await supabase
        .from('tasks_items')
        .select('priority, date')
        .eq('user_id', userId);

      const counts = {
        high: 0,
        medium: 0,
        low: 0
      };

      if (tasksData) {
        tasksData.forEach(task => {
          if (task.priority === 'high') counts.high++;
          else if (task.priority === 'medium') counts.medium++;
          else if (task.priority === 'low') counts.low++;
        });
      }


      // Если нет данных, показываем тестовые данные
      if (counts.high === 0 && counts.medium === 0 && counts.low === 0) {
        setPriorities({ high: 4, medium: 2, low: 1 });
      } else {
        setPriorities(counts);
      }
    } catch (error) {
      console.error('Error loading priorities data:', error);
    } finally {
      setLoading(false);
    }
  };

  const total = priorities.high + priorities.medium + priorities.low;

  const getPercentage = (count: number) => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };


  return (
    <div className="h-full flex flex-col">
      <WidgetHeader
        icon={<Target className="w-5 h-5" />}
        title="Приоритеты"
        subtitle="Показывает распределение задач"
      />

      <div className="flex-1 p-6 flex flex-col justify-center">
        {/* Круги в стиле Apple Watch */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-40 h-40">
            {/* Низкий приоритет - внутренний круг */}
            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="25"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="25"
                fill="none"
                stroke={PRIORITY_COLORS.low}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 25}`}
                strokeDashoffset={`${2 * Math.PI * 25 * (1 - getPercentage(priorities.low) / 100)}`}
              />
            </svg>
            
            {/* Средний приоритет - средний круг */}
            <svg className="absolute top-0 left-0 w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="35"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="35"
                fill="none"
                stroke={PRIORITY_COLORS.medium}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 35}`}
                strokeDashoffset={`${2 * Math.PI * 35 * (1 - getPercentage(priorities.medium) / 100)}`}
              />
            </svg>
            
            {/* Высокий приоритет - внешний круг */}
            <svg className="absolute top-0 left-0 w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={PRIORITY_COLORS.high}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - getPercentage(priorities.high) / 100)}`}
              />
            </svg>
          </div>
        </div>

        {/* Легенда */}
        <div className="space-y-3">
          {Object.entries(priorities).map(([priority, count]) => (
            <div key={priority} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] }}
                />
                <span className="text-sm font-medium text-gray-700">
                  {PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{count} задач</span>
                <span className="text-sm text-gray-500">{getPercentage(count)}%</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default PrioritiesWidget;
