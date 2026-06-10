import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/monitoring'
import { CheckSquare, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useSafeTranslation } from '@/utils/safeTranslation';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import WidgetHeader from './WidgetHeader';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  filterVisibleTaskProjects,
  resolveTaskProjectDisplayName,
} from '@/lib/taskProjects';

interface TasksStatsWidgetProps {
  type: 'total' | 'completed';
  selectedWeek?: Date;
}

interface ProjectStats {
  project_name: string;
  count: number;
  percentage: number;
}

interface TaskRow {
  id: string;
  status: string;
  project_id: string | null;
  date?: string;
}

const emptyStats = {
  current: 0,
  previous: 0,
  change: 0,
  changePercent: 0,
};

const TasksStatsWidget = ({ type, selectedWeek = new Date() }: TasksStatsWidgetProps) => {
  const { t } = useSafeTranslation();
  const { userId, loading: authLoading } = useSupabaseAuth();
  const [stats, setStats] = useState(emptyStats);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      setStats(emptyStats);
      setProjectStats([]);
      setLoading(false);
      return;
    }

    const loadStats = async () => {
    try {
      setLoading(true);

      const noProjectLabel = t('tasks.noProject') || 'No Project';
      const selectedWeekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
      const selectedWeekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
      const previousWeekStart = startOfWeek(subWeeks(selectedWeek, 1), { weekStartsOn: 1 });
      const previousWeekEnd = endOfWeek(subWeeks(selectedWeek, 1), { weekStartsOn: 1 });

      const currentWeekStart = selectedWeekStart.toISOString().split('T')[0];
      const currentWeekEnd = selectedWeekEnd.toISOString().split('T')[0];
      const previousWeekStartStr = previousWeekStart.toISOString().split('T')[0];
      const previousWeekEndStr = previousWeekEnd.toISOString().split('T')[0];

      const selectFields = 'id, status, project_id, date';

      let currentQuery = supabase
        .from('tasks_items')
        .select(selectFields)
        .eq('user_id', userId)
        .gte('date', currentWeekStart)
        .lte('date', currentWeekEnd);

      let previousQuery = supabase
        .from('tasks_items')
        .select(selectFields)
        .eq('user_id', userId)
        .gte('date', previousWeekStartStr)
        .lte('date', previousWeekEndStr);

      if (type === 'completed') {
        currentQuery = currentQuery.eq('status', 'closed');
        previousQuery = previousQuery.eq('status', 'closed');
      }

      const [{ data: currentData, error: currentError }, { data: previousData }] = await Promise.all([
        currentQuery.order('date', { ascending: false }),
        previousQuery,
      ]);

      if (currentError) {
        logger.error('Error loading tasks stats:', currentError);
      }

      const currentTasks = (currentData || []) as TaskRow[];
      const previousTasks = (previousData || []) as TaskRow[];
      const currentCount = currentTasks.length;
      const previousCount = previousTasks.length;

      const change = currentCount - previousCount;
      const changePercent = previousCount > 0 ? Math.round((change / previousCount) * 100) : 0;

      const { data: allProjects, error: projectsError } = await supabase
        .from('tasks_projects')
        .select('id, name')
        .eq('user_id', userId)
        .order('name');

      const visibleProjects = filterVisibleTaskProjects(
        allProjects || [],
        t('projects.uncategorized')
      );

      const projectMap: Record<string, string> = {};
      visibleProjects.forEach((project) => {
        projectMap[project.id] = project.name;
      });

      if (projectsError || !allProjects) {
        const uniqueProjectIds = new Set<string>();
        currentTasks.forEach((task) => {
          if (task.project_id) uniqueProjectIds.add(task.project_id);
        });
        Array.from(uniqueProjectIds).forEach((projectId, index) => {
          if (!projectMap[projectId]) {
            projectMap[projectId] =
              t('dashboard.projectNumber', { number: index + 1 }) || `Project ${index + 1}`;
          }
        });
      }

      const projectCounts: Record<string, number> = {};
      visibleProjects.forEach((project) => {
        projectCounts[project.name] = 0;
      });
      projectCounts[noProjectLabel] = 0;

      currentTasks.forEach((task) => {
        const label = resolveTaskProjectDisplayName(
          task.project_id,
          projectMap,
          noProjectLabel
        );
        projectCounts[label] = (projectCounts[label] || 0) + 1;
      });

      const projectStatsArray: ProjectStats[] = Object.entries(projectCounts)
        .filter(([, count]) => count > 0)
        .map(([project_name, count]) => ({
          project_name,
          count,
          percentage: currentCount > 0 ? Math.round((count / currentCount) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        current: currentCount,
        previous: previousCount,
        change,
        changePercent
      });

      setProjectStats(projectStatsArray);
    } catch (error) {
      logger.error('Error loading tasks stats:', error);
    } finally {
      setLoading(false);
    }
    };

    loadStats();
    // `t` from useSafeTranslation is unstable (new function each render) — must not be a dep
  }, [type, selectedWeek, userId, authLoading]);

  const isPositive = stats.change >= 0;
  const title = type === 'total' ? t('dashboard.createdTasks') || 'Created Tasks' : t('dashboard.completedTasks') || 'Completed Tasks';

  return (
    <div className="h-full flex flex-col">
      <WidgetHeader
        icon={<CheckSquare className="w-5 h-5" />}
        title={title}
        subtitle={t('dashboard.tasksStatsDescription') || 'Task statistics'}
      />

      <div className="flex-1 p-6 flex flex-col items-start justify-start min-h-0">
        {loading ? (
          <>
            <Skeleton variant="rectangular" height={48} className="mb-2 rounded-lg" />
            <div className="flex items-center gap-2 mb-3">
              <Skeleton variant="rectangular" width={100} height={20} className="rounded" />
            </div>
            <div className="space-y-2 w-full">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Skeleton variant="text" width="60%" height={16} />
                    <Skeleton variant="text" width={60} height={16} />
                  </div>
                  <Skeleton variant="rectangular" height={6} className="rounded-full" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {stats.current}
            </div>

            <div className="flex items-center gap-2 text-sm mb-3">
              {stats.change !== 0 && (
                <>
                  {isPositive ? (
                    <TrendingUp className="w-5 h-5 text-gray-900" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-gray-900" />
                  )}
                  <span className="font-medium text-gray-900">
                    {isPositive ? '+' : '-'}{Math.abs(stats.changePercent)}%
                  </span>
                </>
              )}
              <span className="text-xs text-gray-500">
                {isPositive ? t('dashboard.moreThan') || 'More than' : t('dashboard.lessThan') || 'Less than'} {t('dashboard.thanLastWeek') || 'than last week'}
              </span>
            </div>

            <div className="space-y-2 w-full">
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
                <div className="text-left text-gray-500 py-2">
                  <div className="text-xs">{t('dashboard.noProjectData') || 'No project data'}</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TasksStatsWidget;
