import { logger } from '@/lib/monitoring'
import React, { lazy, ComponentType } from 'react'
import { isDevelopment } from '@/lib/env'

// Lazy load components with error boundaries
export function createLazyComponent<T extends ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>,
  fallback?: ComponentType
) {
  const LazyComponent = lazy(importFunction)
  
  return function LazyWrapper(props: React.ComponentProps<T>) {
    const FallbackComponent = fallback || (() => React.createElement('div', null, 'Загрузка...'))
    return React.createElement(
      React.Suspense,
      { fallback: React.createElement(FallbackComponent) },
      React.createElement(LazyComponent, props)
    )
  }
}

// Preload components on hover/focus
export function usePreloadComponent<T extends ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>
) {
  const preloadRef = React.useRef<Promise<any> | null>(null)

  const preload = React.useCallback(() => {
    if (!preloadRef.current) {
      preloadRef.current = importFunction()
    }
    return preloadRef.current
  }, [importFunction])

  const handleMouseEnter = React.useCallback(() => {
    preload()
  }, [preload])

  const handleFocus = React.useCallback(() => {
    preload()
  }, [preload])

  return {
    preload,
    preloadProps: {
      onMouseEnter: handleMouseEnter,
      onFocus: handleFocus
    }
  }
}

// Route-based code splitting
export const LazyPages = {
  Home: lazy(() => import('@/pages/Home')),
  Finance: lazy(() => import('@/pages/Finance')),
  Tasks: lazy(() => import('@/pages/Tasks')),
  Notes: lazy(() => import('@/pages/Notes')),
  Login: lazy(() => import('@/pages/Login')),
}

// Feature-based code splitting
export const LazyFeatures = {
  TaskModal: lazy(() => import('@/components/TaskViewModal')),
  TaskAddModal: lazy(() => import('@/components/TaskAddModal')),
  ModernTaskModal: lazy(() => import('@/components/ModernTaskModal')),
  TaskFilterModal: lazy(() => import('@/components/TaskFilterModal')),
  NoteEditor: lazy(() => import('@/components/notes/NoteEditorModal')),
  CellEditor: lazy(() => import('@/components/CellEditor')),
  AnnualStatsModal: lazy(() => import('@/components/AnnualStatsModal'))
}

// Component-based code splitting
export const LazyComponents = {
  VirtualizedList: lazy(() => import('@/components/VirtualizedList').then(module => ({ default: module.VirtualizedList }))),
  AppLoader: lazy(() => import('@/components/AppLoader')),
  Sidebar: lazy(() => import('@/components/Sidebar')),
  WeekTimeline: lazy(() => import('@/components/WeekTimeline')),
  MobileDayNavigator: lazy(() => import('@/components/MobileDayNavigator')),
  ProjectSidebar: lazy(() => import('@/components/ProjectSidebar')),
  FolderSidebar: lazy(() => import('@/components/FolderSidebar'))
}

// Dashboard widgets (heavy components)
export const LazyWidgets = {
  TasksStatsWidget: lazy(() => import('@/components/dashboard/widgets/TasksStatsWidget')),
  BudgetWidget: lazy(() => import('@/components/dashboard/widgets/BudgetWidget')),
  PrioritiesWidget: lazy(() => import('@/components/dashboard/widgets/PrioritiesWidget')),
  TasksTodayWidget: lazy(() => import('@/components/dashboard/widgets/TasksTodayWidget')),
  PlannedExpensesWidget: lazy(() => import('@/components/dashboard/widgets/PlannedExpensesWidget')),
  ProductivityWidget: lazy(() => import('@/components/dashboard/widgets/ProductivityWidget')),
  DebugBanner: lazy(() => import('@/components/dashboard/widgets/DebugBanner'))
}

// Finance components (heavy)
export const LazyFinance = {
  CategoryRow: lazy(() => import('@/components/finance/CategoryRow')),
  SummaryRow: lazy(() => import('@/components/finance/SummaryRow')),
  SectionHeader: lazy(() => import('@/components/finance/SectionHeader')),
  YearToolbar: lazy(() => import('@/components/finance/YearToolbar')),
  MobileFinanceDay: lazy(() => import('@/components/finance/MobileFinanceDay')),
  NewCategoryMenu: lazy(() => import('@/components/finance/NewCategoryMenu')),
  NewCellMenu: lazy(() => import('@/components/finance/NewCellMenu'))
}

// Dynamic imports for heavy libraries
export const LazyLibraries = {
  dateFns: () => import('date-fns')
  // chartJs: () => import('chart.js'), // Uncomment when chart.js is installed
  // monaco: () => import('@monaco-editor/react') // Uncomment when @monaco-editor/react is installed
}

// Hook for loading states
export function useLazyLoadingState() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const loadComponent = React.useCallback(async <T>(
    importFunction: () => Promise<T>
  ): Promise<T | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const module = await importFunction()
      return module
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load component'))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    error,
    loadComponent
  }
}

// Advanced lazy loading with intersection observer
export function useIntersectionLazyLoading<T extends ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>,
  options: IntersectionObserverInit = {}
) {
  const [Component, setComponent] = React.useState<T | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !Component && !isLoading) {
          setIsLoading(true)
          try {
            const module = await importFunction()
            setComponent(() => module.default)
          } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load component'))
          } finally {
            setIsLoading(false)
          }
          observer.disconnect()
        }
      },
      { threshold: 0.1, ...options }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [importFunction, Component, isLoading, options])

  return { ref, Component, isLoading, error }
}

// Hook for preloading components on user interaction
export function useSmartPreloading<T extends ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>,
  preloadTriggers: ('hover' | 'focus' | 'mousedown')[] = ['hover', 'focus']
) {
  const preloadRef = React.useRef<Promise<any> | null>(null)

  const preload = React.useCallback(() => {
    if (!preloadRef.current) {
      preloadRef.current = importFunction()
    }
    return preloadRef.current
  }, [importFunction])

  const preloadProps = React.useMemo(() => {
    const props: any = {}
    
    if (preloadTriggers.includes('hover')) {
      props.onMouseEnter = preload
    }
    
    if (preloadTriggers.includes('focus')) {
      props.onFocus = preload
    }
    
    if (preloadTriggers.includes('mousedown')) {
      props.onMouseDown = preload
    }
    
    return props
  }, [preload, preloadTriggers])

  return { preload, preloadProps }
}

// Hook for progressive loading with priority
export function useProgressiveLoading<T extends ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>,
  priority: 'high' | 'medium' | 'low' = 'medium'
) {
  const [Component, setComponent] = React.useState<T | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const loadComponent = React.useCallback(async () => {
    if (Component || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      // Add delay for low priority components
      if (priority === 'low') {
        await new Promise(resolve => setTimeout(resolve, 100))
      } else if (priority === 'medium') {
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      const module = await importFunction()
      setComponent(() => module.default)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load component'))
    } finally {
      setIsLoading(false)
    }
  }, [importFunction, Component, isLoading, priority])

  // Auto-load high priority components
  React.useEffect(() => {
    if (priority === 'high') {
      loadComponent()
    }
  }, [loadComponent, priority])

  return { Component, isLoading, error, loadComponent }
}

// Bundle analyzer utility
export function analyzeBundleSize() {
  if (!isDevelopment()) return

  // Monitor bundle size
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    entries.forEach((entry) => {
      if (entry.entryType === 'resource') {
        const resource = entry as PerformanceResourceTiming
        if (resource.name.includes('.js') || resource.name.includes('.css')) {
          logger.debug(`Bundle loaded: ${resource.name} (${(resource.transferSize / 1024).toFixed(2)}KB)`)
        }
      }
    })
  })

  observer.observe({ entryTypes: ['resource'] })

  return () => observer.disconnect()
}

