import React, { Suspense, lazy } from 'react'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { supabase } from '@/lib/supabaseClient'

// Lazy load widgets
const TasksToday = lazy(() => import('@/components/dashboard/widgets/TasksToday').then(m => ({ default: m.TasksToday })))
const RecentNotes = lazy(() => import('@/components/dashboard/widgets/RecentNotes').then(m => ({ default: m.RecentNotes })))
const FinanceMonth = lazy(() => import('@/components/dashboard/widgets/FinanceMonth').then(m => ({ default: m.FinanceMonth })))
const DebugBanner = lazy(() => import('@/components/dashboard/widgets/DebugBanner').then(m => ({ default: m.DebugBanner })))

// Loading skeleton
const WidgetSkeleton = () => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
    <div className="h-6 bg-gray-200 rounded mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  </div>
)

// Preload critical data
const usePreloadedData = () => {
  // Preload user data
  const { data: user } = useSupabaseQuery(
    'user',
    () => supabase.auth.getUser(),
    { staleTime: 10 * 60 * 1000 } // 10 minutes
  )

  return { user }
}

export default function HomeOptimized() {
  const { user } = usePreloadedData()

  return (
    <div className="p-0 md:p-8">
      <Suspense fallback={<div className="h-8 bg-gray-200 rounded mb-4 animate-pulse" />}>
        <DebugBanner />
      </Suspense>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-0">
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
            <RecentNotes />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

