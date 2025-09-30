import React, { Suspense, lazy } from 'react';

// Lazy load widgets
const TasksToday = lazy(() => import('./widgets/TasksToday').then(m => ({ default: m.TasksToday })));
const RecentNotes = lazy(() => import('./widgets/RecentNotes').then(m => ({ default: m.RecentNotes })));
const FinanceMonth = lazy(() => import('./widgets/FinanceMonth').then(m => ({ default: m.FinanceMonth })));
const DebugBanner = lazy(() => import('./widgets/DebugBanner').then(m => ({ default: m.DebugBanner })));
const QuickLinks = lazy(() => import('./widgets/QuickLinks').then(m => ({ default: m.QuickLinks })));

// Loading skeleton for widgets
const WidgetSkeleton = () => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
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
    <div className="p-6">
      <Suspense fallback={<div className="h-8 bg-gray-200 rounded mb-6 animate-pulse" />}>
        <DebugBanner />
      </Suspense>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Suspense fallback={<WidgetSkeleton />}>
            <TasksToday />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton />}>
            <FinanceMonth />
          </Suspense>
        </div>
        <div className="xl:col-span-1 space-y-6">
          <Suspense fallback={<WidgetSkeleton />}>
            <QuickLinks />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton />}>
            <RecentNotes />
          </Suspense>
        </div>
      </div>
    </div>
  );
}