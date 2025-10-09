import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useTranslation } from 'react-i18next';
import WidgetHeader from './WidgetHeader';

interface DayData {
  day: string;
  tasks: number;
  completed: number;
  productivity: number; // completion percentage
}

const ProductivityWidget = () => {
  const { t } = useTranslation();
  const { userId } = useSupabaseAuth();
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedPeriod = 'weekly'; // Fixed period - week

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
        // Current week
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
        endOfWeek.setHours(23, 59, 59, 999);
        
        startDate = startOfWeek;
        endDate = endOfWeek;
      } else {
        // Current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      }

      const { data: tasksData, error } = await supabase
        .from('tasks_items')
        .select('date, status, project_id')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) {
        console.error('Error loading productivity data:', error);
        setWeekData([]);
        return;
      }

      // Group tasks by day of week
      const dayStats: Record<string, { total: number; completed: number }> = {};
      
      // Initialize all days of week
      const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      dayNames.forEach(day => {
        dayStats[day] = { total: 0, completed: 0 };
      });
      
      (tasksData || []).forEach(task => {
        const taskDate = new Date(task.date);
        const dayOfWeek = taskDate.getDay(); // 0 = Sunday, 1 = Monday, ...
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const dayName = dayNames[dayOfWeek];
        
        // Debug logging
        console.log(`Task: date=${task.date}, day=${dayName}, status="${task.status}", project_id=${task.project_id}`);
        
        dayStats[dayName].total++;
        if (task.status === 'closed') {
          dayStats[dayName].completed++;
        }
      });

      // Create week data
      const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
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

      console.log('Final dayStats:', dayStats);
      console.log('WeekDataArray:', weekDataArray);
      setWeekData(weekDataArray);
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
    return weekData.reduce((max, day) => day.completed > max.completed ? day : max, weekData[0] || { day: 'MON', tasks: 0, completed: 0 });
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
        title={t('dashboard.productivity')}
        subtitle={t('dashboard.productivityDescription')}
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
            {getTotalCompleted()}/{totalTasks} {t('dashboard.tasks')}
          </p>
        </div>

        {/* Bar chart */}
        <div className="flex-1 flex flex-col justify-end">
          <div className="flex items-end justify-between gap-1 h-full min-h-24">
            {weekData.map((day, index) => {
              // Bar height = total number of tasks, but minimum 1/3 of height with one task
              const baseHeight = maxTasks > 0 ? (1 / maxTasks) * 100 : 100; // height for 1 task
              const minHeight = baseHeight / 3; // 1/3 of height with one task
              const totalHeight = day.tasks > 0 ? (day.tasks / maxTasks) * 100 : minHeight;
              // Black part height = completion percentage of bar height (in percentage)
              const completionPercentage = day.tasks > 0 ? day.completed / day.tasks : 0;
              const completedHeight = completionPercentage * 100; // Percentage of bar height
              const isBusiest = day.completed === busiestDay.completed && day.completed > 0;
              
              // Debug for Thursday
              if (day.day === 'THU') {
                console.log(`Thursday: tasks=${day.tasks}, completed=${day.completed}, maxTasks=${maxTasks}`);
                console.log(`Thursday: totalHeight=${totalHeight}%, completionPercentage=${completionPercentage}, completedHeight=${completedHeight}%`);
                console.log(`Thursday: completion percentage=${day.completed}/${day.tasks}=${Math.round(completionPercentage * 100)}%`);
                console.log(`Thursday: allCompleted=${day.completed === day.tasks}, willShowFullBlack=${day.completed === day.tasks && day.tasks > 0}`);
              }
              
              return (
                <div key={day.day} className="flex flex-col items-center flex-1 h-full">
                  <div className="w-full flex flex-col items-center justify-end h-full mb-2">
                    {/* Main bar */}
                    {day.completed === day.tasks && day.tasks > 0 ? (
                      /* If all tasks completed - fully black bar */
                      <div
                        className="w-full rounded-t-md relative overflow-hidden bg-black"
                        style={{ 
                          height: `${Math.max(totalHeight, minHeight)}%`,
                          minHeight: '8px'
                        }}
                      >
                        {/* Diagonal lines for pattern */}
                        <div 
                          className="absolute inset-0 opacity-20"
                          style={{
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
                          }}
                        ></div>
                      </div>
                    ) : (
                      /* Regular gray bar with black part */
                      <div
                        className="w-full rounded-t-md relative overflow-hidden bg-gray-200"
                        style={{ 
                          height: `${Math.max(totalHeight, minHeight)}%`,
                          minHeight: '8px'
                        }}
                      >
                        {/* Black part - completed tasks */}
                        {day.completed > 0 && (
                          <div
                            className="absolute bottom-0 left-0 right-0 rounded-t-md bg-black"
                            style={{ 
                              height: `${completedHeight}%`,
                              minHeight: completedHeight > 0 ? '4px' : '0px'
                            }}
                          >
                            {/* Diagonal lines for pattern */}
                            <div 
                              className="absolute inset-0 opacity-20"
                              style={{
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
                              }}
                            ></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 font-medium">
                    {t(`dashboard.days.${day.day}`)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductivityWidget;
