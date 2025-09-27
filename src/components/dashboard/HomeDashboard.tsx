import React, { Suspense, lazy } from 'react';

// Lazy load widgets
const TasksToday = lazy(() => import('./widgets/TasksToday'));
const RecentNotes = lazy(() => import('./widgets/RecentNotes'));
const FinanceMonth = lazy(() => import('./widgets/FinanceMonth'));
const DebugBanner = lazy(() => import('./widgets/DebugBanner'));

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
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Главная страница</h1>
      <div className="card">
        <p>Простая версия для отладки React ошибок #306</p>
        <p>Если эта страница работает без ошибок, проблема в виджетах.</p>
      </div>
    </div>
  );
}