import React, { useState, useEffect } from 'react';
import { CheckSquare, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import WidgetHeader from './WidgetHeader';

interface TasksStatsWidgetProps {
  type: 'total' | 'completed';
}

interface ProjectStats {
  project_name: string;
  count: number;
  percentage: number;
}

const TasksStatsWidget = ({ type }: TasksStatsWidgetProps) => {
  const [stats, setStats] = useState({
    current: 0,
    previous: 0,
    change: 0,
    changePercent: 0
  });
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [type]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Получаем текущий и предыдущий месяц
      const now = new Date();
      const currentMonth = now.getMonth(); // 0-11
      const currentYear = now.getFullYear();

      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      // Форматируем даты для запроса - БЕЗ ПРОБЛЕМ С ЧАСОВЫМИ ПОЯСАМИ!
      const currentMonthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]; // Последний день месяца
      
      const previousMonthStart = new Date(previousYear, previousMonth, 1).toISOString().split('T')[0];
      const previousMonthEnd = new Date(previousYear, previousMonth + 1, 0).toISOString().split('T')[0];

      // Запрос для текущего месяца - строгий фильтр по датам
      const { data: currentData, error: currentError } = await supabase
        .from('tasks_items')
        .select('id, title, status, project_id, date')
        .gte('date', currentMonthStart)
        .lte('date', currentMonthEnd)
        .order('date', { ascending: false });

      // Запрос для предыдущего месяца
      const { data: previousData } = await supabase
        .from('tasks_items')
        .select('id, status')
        .gte('date', previousMonthStart)
        .lte('date', previousMonthEnd);

      let currentCount = 0;
      let previousCount = 0;

      if (type === 'total') {
        // Все задачи уже отфильтрованы по датам в запросе к БД
        const tasksWithProject = (currentData || []).filter(task => task.project_id);
        currentCount = tasksWithProject.length;
        previousCount = (previousData || []).filter(task => task.project_id).length;
      } else {
        // Все задачи уже отфильтрованы по датам в запросе к БД
        const closedTasksWithProject = (currentData || []).filter(task => task.status === 'closed' && task.project_id);
        currentCount = closedTasksWithProject.length;
        previousCount = (previousData || []).filter(task => task.status === 'closed' && task.project_id).length;
      }

      const change = currentCount - previousCount;
      const changePercent = previousCount > 0 ? Math.round((change / previousCount) * 100) : 0;

      // Получаем проекты отдельно
      const { data: allProjects, error: projectsError } = await supabase
        .from('tasks_projects')
        .select('id, name')
        .order('name');

      // Вычисляем статистику по проектам
      const projectCounts: Record<string, number> = {};
      const filteredData = type === 'total' 
        ? (currentData || []).filter(task => task.project_id) // Только задачи с проектом
        : (currentData || []).filter(task => task.status === 'closed' && task.project_id); // Только закрытые задачи с проектом

      // Создаем мапу проектов для быстрого поиска
      const projectMap: Record<string, string> = {};
      if (allProjects && !projectsError) {
        allProjects.forEach(project => {
          projectMap[project.id] = project.name;
        });
      }

      // Если таблица проектов недоступна, используем данные из задач
      if (projectsError || !allProjects) {
        // Собираем уникальные project_id из задач
        const uniqueProjectIds = new Set<string>();
        filteredData.forEach(task => {
          if (task.project_id) {
            uniqueProjectIds.add(task.project_id);
          }
        });
        
        // Создаем мапу с названиями "Проект 1", "Проект 2" и т.д.
        Array.from(uniqueProjectIds).forEach((projectId, index) => {
          projectMap[projectId] = `Проект ${index + 1}`;
        });
      }

      // Инициализируем все проекты с нулевыми значениями
      if (allProjects && !projectsError) {
        allProjects.forEach(project => {
          projectCounts[project.name] = 0;
        });
      } else {
        // Если проекты недоступны, инициализируем найденные
        Object.values(projectMap).forEach(projectName => {
          projectCounts[projectName] = 0;
        });
      }

      // Убираем "Без проекта" - все задачи должны иметь проект

      // Подсчитываем задачи по проектам
      filteredData.forEach(task => {
        // Учитываем только задачи с проектом
        if (task.project_id) {
          const projectName = projectMap[task.project_id] || `Проект ${task.project_id.slice(0, 8)}`;
          projectCounts[projectName] = (projectCounts[projectName] || 0) + 1;
        }
      });

      const projectStatsArray: ProjectStats[] = Object.entries(projectCounts)
        .map(([project_name, count]) => ({
          project_name,
          count,
          percentage: currentCount > 0 ? Math.round((count / currentCount) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Показываем топ-5 проектов

      setStats({
        current: currentCount,
        previous: previousCount,
        change,
        changePercent
      });

      setProjectStats(projectStatsArray);
    } catch (error) {
      console.error('Error loading tasks stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const isPositive = stats.change >= 0;
  const title = type === 'total' ? 'Созданные задачи' : 'Закрытые задачи';
  const icon = type === 'total' ? CheckSquare : CheckSquare;

  return (
    <div className="h-full flex flex-col">
      <WidgetHeader
        icon={<CheckSquare className="w-5 h-5" />}
        title={title}
        subtitle="Показывает статистику задач"
      />

      <div className="flex-1 p-6 flex flex-col justify-center">
        {/* Большая цифра */}
        <div className="text-4xl font-bold text-gray-900 mb-2">
          {stats.current}
        </div>
        
        {/* Процент изменения */}
        <div className="flex items-center gap-2 text-sm mb-3">
          {stats.change !== 0 && (
            <>
              {isPositive ? (
                <TrendingUp className="w-5 h-5 text-gray-900" />
              ) : (
                <TrendingDown className="w-5 h-5 text-gray-900" />
              )}
              <span className="font-medium text-gray-900">
                +{Math.abs(stats.changePercent)}%
              </span>
            </>
          )}
          <span className="text-xs text-gray-500">
            {isPositive ? 'больше' : 'меньше'} чем в прошлом месяце
          </span>
        </div>

        {/* Горизонтальные бары по проектам */}
        <div className="space-y-2">
          {projectStats.length > 0 ? (
            projectStats.map((project, index) => {
              const colors = ['bg-black', 'bg-gray-800', 'bg-gray-600', 'bg-gray-500', 'bg-gray-400'];
              const color = colors[index] || 'bg-gray-500';
              
              return (
                <div key={project.project_name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700 truncate flex-1">
                      {project.project_name}
                    </span>
                    <div className="flex items-center gap-1 ml-2">
                      <span className="text-xs font-bold text-gray-900">
                        {project.count}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({project.percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${color}`}
                      style={{ 
                        width: `${Math.max(project.percentage, 2)}%`
                      }}
                    ></div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 py-2">
              <div className="text-xs">Нет данных по проектам</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksStatsWidget;
