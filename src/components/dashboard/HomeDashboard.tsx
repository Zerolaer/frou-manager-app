import React, { Suspense, lazy } from 'react';

// Lazy load widgets
const TasksToday = lazy(() => import('./widgets/TasksToday').then(m => ({ default: m.TasksToday })));
const RecentNotes = lazy(() => import('./widgets/RecentNotes').then(m => ({ default: m.RecentNotes })));
const FinanceMonth = lazy(() => import('./widgets/FinanceMonth').then(m => ({ default: m.FinanceMonth })));
const DebugBanner = lazy(() => import('./widgets/DebugBanner').then(m => ({ default: m.DebugBanner })));

// Loading skeleton for widgets - Jira style
const WidgetSkeleton = () => (
  <div className="card animate-pulse">
    <div className="h-5 bg-neutral-200 rounded mb-3"></div>
    <div className="space-y-2">
      <div className="h-3 bg-neutral-200 rounded"></div>
      <div className="h-3 bg-neutral-200 rounded w-3/4"></div>
      <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
    </div>
  </div>
);

export default function HomeDashboard() {
  return (
    <div className="max-w-7xl mx-auto">
      <Suspense fallback={<div className="h-6 bg-neutral-200 rounded mb-3 animate-pulse" />}>
        <DebugBanner />
      </Suspense>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Suspense fallback={<WidgetSkeleton />}>
            <TasksToday />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton />}>
            <FinanceMonth />
          </Suspense>
        </div>
        <div className="lg:col-span-1 space-y-4">
          <Suspense fallback={<WidgetSkeleton />}>
            <RecentNotes />
          </Suspense>
        </div>
      </div>
    </div>
  );
}