import React, { lazy, ComponentType } from 'react'

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
  Goals: lazy(() => import('@/pages/Goals')),
  Notes: lazy(() => import('@/pages/Notes')),
  Login: lazy(() => import('@/pages/Login'))
}

// Feature-based code splitting
export const LazyFeatures = {
  TaskModal: lazy(() => import('@/components/TaskViewModal')),
  GoalModal: lazy(() => import('@/components/goals/GoalModal')),
  NoteEditor: lazy(() => import('@/components/notes/NoteEditorModal'))
  // FinanceGrid: lazy(() => import('@/components/finance/FinanceGrid')), // Uncomment when component exists
}

// Component-based code splitting
export const LazyComponents = {
  // Chart: lazy(() => import('@/components/Chart')), // Uncomment when component exists
  // Calendar: lazy(() => import('@/components/Calendar')), // Uncomment when component exists
  // FileUpload: lazy(() => import('@/components/FileUpload')), // Uncomment when component exists
  // RichTextEditor: lazy(() => import('@/components/RichTextEditor')) // Uncomment when component exists
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

// Bundle analyzer utility
export function analyzeBundleSize() {
  if (process.env.NODE_ENV !== 'development') return

  // Monitor bundle size
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    entries.forEach((entry) => {
      if (entry.entryType === 'resource') {
        const resource = entry as PerformanceResourceTiming
        if (resource.name.includes('.js') || resource.name.includes('.css')) {
          console.log(`Bundle loaded: ${resource.name} (${(resource.transferSize / 1024).toFixed(2)}KB)`)
        }
      }
    })
  })

  observer.observe({ entryTypes: ['resource'] })

  return () => observer.disconnect()
}

