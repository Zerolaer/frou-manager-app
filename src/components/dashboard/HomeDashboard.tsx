import React, { Suspense } from 'react';
import BentoGrid, { BentoCard } from './BentoGrid';
import '@/home.css';
import { useTranslation } from 'react-i18next';
import { LazyWidgets } from '@/utils/codeSplitting';
import { WidgetSkeleton } from '@/components/ui/LoadingStates';

export default function HomeDashboard() {
  const { t } = useTranslation()
  return (
    <div className="home-page">
      <Suspense fallback={<WidgetSkeleton />}>
        <LazyWidgets.DebugBanner />
      </Suspense>
      
      <div className="home-grid">
        {/* FIRST ROW */}
        {/* Created Tasks */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <Suspense fallback={<WidgetSkeleton />}>
            <LazyWidgets.TasksStatsWidget type="total" />
          </Suspense>
        </BentoCard>

        {/* Completed Tasks */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <Suspense fallback={<WidgetSkeleton />}>
            <LazyWidgets.TasksStatsWidget type="completed" />
          </Suspense>
        </BentoCard>

        {/* Productivity */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <Suspense fallback={<WidgetSkeleton />}>
            <LazyWidgets.ProductivityWidget />
          </Suspense>
        </BentoCard>

        {/* Tasks Today - stretched block */}
        <BentoCard colSpan={1} rowSpan={2} className="bento-card">
          <Suspense fallback={<WidgetSkeleton />}>
            <LazyWidgets.TasksTodayWidget />
          </Suspense>
        </BentoCard>

        {/* SECOND ROW */}
        {/* Priorities */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <Suspense fallback={<WidgetSkeleton />}>
            <LazyWidgets.PrioritiesWidget />
          </Suspense>
        </BentoCard>

        {/* Planned Expenses */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <Suspense fallback={<WidgetSkeleton />}>
            <LazyWidgets.PlannedExpensesWidget />
          </Suspense>
        </BentoCard>

        {/* Monthly Budget */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <Suspense fallback={<WidgetSkeleton />}>
            <LazyWidgets.BudgetWidget />
          </Suspense>
        </BentoCard>
      </div>
    </div>
  );
}