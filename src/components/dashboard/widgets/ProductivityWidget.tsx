import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/monitoring'
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useSafeTranslation } from '@/utils/safeTranslation';
import WidgetHeader from './WidgetHeader';
import { startOfWeek, endOfWeek, format, eachDayOfInterval } from 'date-fns';

interface DayData {
  day: string;
  tasks: number;
  completed: number;
  productivity: number; // completion percentage
}

interface ProductivityWidgetProps {
  selectedWeek?: Date;
}

const ProductivityWidget = ({ selectedWeek = new Date() }: ProductivityWidgetProps) => {
  const { t } = useSafeTranslation();
  const { userId } = useSupabaseAuth();
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedPeriod = 'weekly'; // Fixed period - week

  useEffect(() => {
    if (!userId) return;
    
    const loadProductivityData = async () => {
    try {
      setLoading(true);
      
      // Use selected week
      const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 }); // Sunday
      
      const startDate = weekStart;
      const endDate = weekEnd;

      const { data: tasksData, error } = await supabase
        .from('tasks_items')
        .select('date, status, project_id')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) {
        logger.error('Error loading productivity data:', error);
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
        // Map to Monday-first week: Sunday=6, Monday=0, Tuesday=1, ..., Saturday=5
        const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday becomes 6, Monday becomes 0
        const dayName = dayNames[dayIndex];
        
        // Debug logging
        logger.debug(`Task: date=${task.date}, day=${dayName}, status="${task.status}", project_id=${task.project_id}`);
        
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

      logger.debug('Final dayStats:', dayStats);
      logger.debug('WeekDataArray:', weekDataArray);
      setWeekData(weekDataArray);
    } catch (error) {
      logger.error('Error loading productivity data:', error);
      setWeekData([]);
    } finally {
      setLoading(false);
    }
    };
    
    loadProductivityData();
  }, [userId, selectedWeek]);

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
        title={t('dashboard.productivity') || 'Productivity'}
        subtitle={t('dashboard.productivityDescription') || 'Weekly productivity overview'}
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
            {getTotalCompleted()}/{totalTasks} {t('dashboard.tasks') || 'tasks'}
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
                logger.debug(`Thursday: tasks=${day.tasks}, completed=${day.completed}, maxTasks=${maxTasks}`);
                logger.debug(`Thursday: totalHeight=${totalHeight}%, completionPercentage=${completionPercentage}, completedHeight=${completedHeight}%`);
                logger.debug(`Thursday: completion percentage=${day.completed}/${day.tasks}=${Math.round(completionPercentage * 100)}%`);
                logger.debug(`Thursday: allCompleted=${day.completed === day.tasks}, willShowFullBlack=${day.completed === day.tasks && day.tasks > 0}`);
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
                    {t('dashboard.days.' + day.day) || day.day}
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
