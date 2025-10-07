import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import WidgetHeader from './WidgetHeader';

interface DayData {
  day: string;
  tasks: number;
  completed: number;
  productivity: number; // процент выполнения
}

export default function ProductivityWidget() {
  const { userId } = useSupabaseAuth();
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedPeriod = 'weekly'; // Фиксированный период - неделя

  useEffect(() => {
    if (!userId) return;
    loadProductivityData();
  }, [userId]);

  const loadProductivityData = async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      if (selectedPeriod === 'weekly') {
        // Текущая неделя
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Понедельник
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Воскресенье
        endOfWeek.setHours(23, 59, 59, 999);
        
        startDate = startOfWeek;
        endDate = endOfWeek;
      } else {
        // Текущий месяц
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      }

      const { data: tasksData, error } = await supabase
        .from('tasks_items')
        .select('date, status, project_id')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .not('project_id', 'is', null); // Только задачи с проектом

      if (error) {
        console.error('Error loading productivity data:', error);
        setWeekData([]);
        return;
      }

      // Группируем задачи по дням недели
      const dayStats: Record<string, { total: number; completed: number }> = {};
      
      // Инициализируем все дни недели
      const dayNames = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
      dayNames.forEach(day => {
        dayStats[day] = { total: 0, completed: 0 };
      });
      
      (tasksData || []).forEach(task => {
        const taskDate = new Date(task.date);
        const dayOfWeek = taskDate.getDay(); // 0 = воскресенье, 1 = понедельник, ...
        const dayNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
        const dayName = dayNames[dayOfWeek];
        
        dayStats[dayName].total++;
        if (task.status === 'closed') {
          dayStats[dayName].completed++;
        }
      });

      // Создаем данные для недели
      const days = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
      const weekDataArray: DayData[] = [];

      days.forEach(day => {
        const stats = dayStats[day] || { total: 0, completed: 0 };
        const productivity = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

        weekDataArray.push({
          day: day,
          tasks: stats.total,
          completed: stats.completed,
          productivity
        });
      });

      setWeekData(weekDataArray);
      console.log('ProductivityWidget - Productivity data:', weekDataArray);
      console.log('ProductivityWidget - Tasks data from DB:', {
        allTasks: tasksData?.length || 0,
        tasksData: tasksData?.map(task => ({
          date: task.date,
          status: task.status,
          project_id: task.project_id
        }))
      });
      console.log('ProductivityWidget - Day stats:', dayStats);
    } catch (error) {
      console.error('Error loading productivity data:', error);
      setWeekData([]);
    } finally {
      setLoading(false);
    }
  };

  const getTotalTasks = () => weekData.reduce((sum, day) => sum + day.tasks, 0);
  const getTotalCompleted = () => weekData.reduce((sum, day) => sum + day.completed, 0);
  const getAverageProductivity = () => {
    const totalTasks = getTotalTasks();
    return totalTasks > 0 ? Math.round((getTotalCompleted() / totalTasks) * 100) : 0;
  };

  const getBusiestDay = () => {
    return weekData.reduce((max, day) => day.completed > max.completed ? day : max, weekData[0] || { day: 'ПН', tasks: 0, completed: 0 });
  };

  const getMaxTasks = () => Math.max(...weekData.map(day => day.tasks), 1);

  const totalTasks = getTotalTasks();
  const averageProductivity = getAverageProductivity();
  const busiestDay = getBusiestDay();
  const maxTasks = getMaxTasks();

  return (
    <div className="h-full flex flex-col">
      <WidgetHeader
        icon={<BarChart3 className="w-5 h-5" />}
        title="Продуктивность"
        subtitle="Показывает эффективность работы"
      />


      <div className="flex-1 p-6 flex flex-col">
        {/* Main metrics */}
        <div className="mb-6">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {averageProductivity}%
          </div>
          <div className="flex items-center gap-1 text-gray-600 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-base font-medium">+{averageProductivity}%</span>
          </div>
          <p className="text-base text-gray-600">
            {getTotalCompleted()}/{totalTasks} задач
          </p>
        </div>

        {/* Bar chart */}
        <div className="flex-1 flex flex-col justify-end">
          <div className="flex items-end justify-between gap-1 h-full min-h-24">
            {weekData.map((day, index) => {
              // Высота столбика = общее количество задач, но минимум 1/3 от высоты с одной задачей
              const baseHeight = maxTasks > 0 ? (1 / maxTasks) * 100 : 100; // высота для 1 задачи
              const minHeight = baseHeight / 3; // 1/3 от высоты с одной задачей
              const totalHeight = day.tasks > 0 ? (day.tasks / maxTasks) * 100 : minHeight;
              // Высота черной части = выполненные задачи
              const completedHeight = day.tasks > 0 ? (day.completed / day.tasks) * totalHeight : 0;
              const isBusiest = day.completed === busiestDay.completed && day.completed > 0;
              
              return (
                <div key={day.day} className="flex flex-col items-center flex-1 h-full">
                  <div className="w-full flex flex-col items-center justify-end h-full mb-2">
                    {/* Основной столбик - всегда показываем */}
                    <div
                      className="w-full rounded-t-md relative overflow-hidden bg-gray-200"
                      style={{ 
                        height: `${Math.max(totalHeight, minHeight)}%`,
                        minHeight: '8px'
                      }}
                    >
                      {/* Черная часть - выполненные задачи */}
                      {day.completed > 0 && (
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-t-md bg-black"
                          style={{ 
                            height: `${completedHeight}%`,
                            minHeight: completedHeight > 0 ? '4px' : '0px'
                          }}
                        >
                          {/* Диагональные линии для паттерна */}
                          <div 
                            className="absolute inset-0 opacity-20"
                            style={{
                              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 font-medium">
                    {day.day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
