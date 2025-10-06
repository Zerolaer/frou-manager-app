import React, { Suspense, lazy } from 'react';
import BentoGrid, { BentoCard } from './BentoGrid';
import '@/home.css';

// Lazy load widgets
const TasksStatsWidget = lazy(() => import('./widgets/TasksStatsWidget').then(m => ({ default: m.default })));
const BudgetWidget = lazy(() => import('./widgets/BudgetWidget').then(m => ({ default: m.default })));
const PrioritiesWidget = lazy(() => import('./widgets/PrioritiesWidget').then(m => ({ default: m.default })));
const TasksTodayWidget = lazy(() => import('./widgets/TasksTodayWidget').then(m => ({ default: m.default })));
const PlannedExpensesWidget = lazy(() => import('./widgets/PlannedExpensesWidget').then(m => ({ default: m.default })));
const ProductivityWidget = lazy(() => import('./widgets/ProductivityWidget').then(m => ({ default: m.default })));
const DebugBanner = lazy(() => import('./widgets/DebugBanner').then(m => ({ default: m.DebugBanner })));

// Loading skeleton for widgets
const WidgetSkeleton = () => (
  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm animate-pulse">
    <div className="h-6 bg-gray-200 rounded mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  </div>
);

export default function HomeDashboard() {
  return (
    <div className="home-page">
      <Suspense fallback={<div className="h-8 bg-gray-200 rounded mb-4 animate-pulse mx-4 mt-4" />}>
        <DebugBanner />
      </Suspense>
      
      <div className="home-grid">
        {/* Созданные задачи */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <Suspense fallback={<WidgetSkeleton />}>
            <TasksStatsWidget type="total" />
          </Suspense>
        </BentoCard>

        {/* Закрытые задачи */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <Suspense fallback={<WidgetSkeleton />}>
            <TasksStatsWidget type="completed" />
          </Suspense>
        </BentoCard>

        {/* Продуктивность */}
        <BentoCard colSpan={2} rowSpan={1} className="bento-card">
          <Suspense fallback={<WidgetSkeleton />}>
            <ProductivityWidget />
          </Suspense>
        </BentoCard>

        {/* Задачи на сегодня - растянутый блок */}
        <BentoCard colSpan={1} rowSpan={2} className="bento-card">
          <Suspense fallback={<WidgetSkeleton />}>
            <TasksTodayWidget />
          </Suspense>
        </BentoCard>

        {/* Приоритеты */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <Suspense fallback={<WidgetSkeleton />}>
            <PrioritiesWidget />
          </Suspense>
        </BentoCard>

        {/* Запланированные траты */}
        <BentoCard colSpan={1} rowSpan={1} className="bento-card">
          <Suspense fallback={<WidgetSkeleton />}>
            <PlannedExpensesWidget />
          </Suspense>
        </BentoCard>

        {/* Бюджет месяца */}
        <BentoCard colSpan={2} rowSpan={1} className="bento-card">
          <Suspense fallback={<WidgetSkeleton />}>
            <BudgetWidget />
          </Suspense>
        </BentoCard>
      </div>
    </div>
  );
}