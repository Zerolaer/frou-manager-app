import React, { Suspense, useState, useEffect } from 'react';
import BentoGrid, { BentoCard } from './BentoGrid';
import '@/home.css';
import { useSafeTranslation } from '@/utils/safeTranslation';
// import { LazyWidgets } from '@/utils/codeSplitting';
import DebugBanner from './widgets/DebugBanner';
import TasksStatsWidget from './widgets/TasksStatsWidget';
import ProductivityWidget from './widgets/ProductivityWidget';
import TasksTodayWidget from './widgets/TasksTodayWidget';
import PrioritiesWidget from './widgets/PrioritiesWidget';
import PlannedExpensesWidget from './widgets/PlannedExpensesWidget';
import BudgetWidget from './widgets/BudgetWidget';
import { WidgetSkeleton } from '@/components/ui/LoadingStates';

export default function HomeDashboard() {
  const { t } = useSafeTranslation()
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date())

  // Listen for week changes from Header
  useEffect(() => {
    const handleWeekChange = (event: CustomEvent) => {
      setSelectedWeek(event.detail)
    }
    
    window.addEventListener('subheader-week-change', handleWeekChange as EventListener)
    return () => {
      window.removeEventListener('subheader-week-change', handleWeekChange as EventListener)
    }
  }, [])

  return (
    <div className="home-page">
      {import.meta.env.DEV && <DebugBanner />}
      
      <div className="home-grid">
        {/* FIRST ROW */}
        {/* Created Tasks */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <TasksStatsWidget type="total" selectedWeek={selectedWeek} />
        </BentoCard>

        {/* Completed Tasks */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <TasksStatsWidget type="completed" selectedWeek={selectedWeek} />
        </BentoCard>

        {/* Productivity */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <ProductivityWidget selectedWeek={selectedWeek} />
        </BentoCard>

        {/* Tasks Today - stretched block */}
        <BentoCard colSpan={1} rowSpan={2} className="bento-card">
          <TasksTodayWidget />
        </BentoCard>

        {/* SECOND ROW */}
        {/* Priorities */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <PrioritiesWidget />
        </BentoCard>

        {/* Planned Expenses */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <PlannedExpensesWidget />
        </BentoCard>

        {/* Monthly Budget */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <BudgetWidget />
        </BentoCard>
      </div>
    </div>
  );
}