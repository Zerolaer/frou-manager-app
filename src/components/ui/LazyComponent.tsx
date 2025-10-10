import React, { Suspense, ComponentType } from 'react'
import { useSmartPreloading } from '@/utils/codeSplitting'
import { WidgetSkeleton, TaskCardSkeleton, FinanceRowSkeleton, ListItemSkeleton, PageSkeleton } from './LoadingStates'

interface LazyComponentProps<T extends ComponentType<any>> {
  importFunction: () => Promise<{ default: T }>
  fallback?: React.ReactNode
  preloadTriggers?: ('hover' | 'focus' | 'mousedown')[]
  [key: string]: any
}

// Smart lazy component with preloading
export function LazyComponent<T extends ComponentType<any>>({
  importFunction,
  fallback,
  preloadTriggers = ['hover', 'focus'],
  ...props
}: LazyComponentProps<T>) {
  const LazyComponent = React.lazy(importFunction)
  const { preloadProps } = useSmartPreloading(importFunction, preloadTriggers)

  return (
    <div {...preloadProps}>
      <Suspense fallback={fallback || <WidgetSkeleton />}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    </div>
  )
}

// Specialized lazy components for different use cases
export function LazyWidget<T extends ComponentType<any>>(props: Omit<LazyComponentProps<T>, 'fallback'>) {
  return <LazyComponent {...(props as any)} fallback={<WidgetSkeleton />} />
}

export function LazyTaskCard<T extends ComponentType<any>>(props: Omit<LazyComponentProps<T>, 'fallback'>) {
  return <LazyComponent {...(props as any)} fallback={<TaskCardSkeleton />} />
}

export function LazyFinanceRow<T extends ComponentType<any>>(props: Omit<LazyComponentProps<T>, 'fallback'>) {
  return <LazyComponent {...(props as any)} fallback={<FinanceRowSkeleton />} />
}

export function LazyListItem<T extends ComponentType<any>>(props: Omit<LazyComponentProps<T>, 'fallback'>) {
  return <LazyComponent {...(props as any)} fallback={<ListItemSkeleton />} />
}

export function LazyPage<T extends ComponentType<any>>(props: Omit<LazyComponentProps<T>, 'fallback'>) {
  return <LazyComponent {...(props as any)} fallback={<PageSkeleton />} />
}

// Intersection-based lazy loading for below-the-fold content
interface IntersectionLazyProps<T extends ComponentType<any>> extends Omit<LazyComponentProps<T>, 'preloadTriggers'> {
  threshold?: number
  rootMargin?: string
}

export function IntersectionLazy<T extends ComponentType<any>>({
  importFunction,
  fallback,
  threshold = 0.1,
  rootMargin = '50px',
  children,
  ...props
}: IntersectionLazyProps<T>) {
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
      { threshold, rootMargin }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [importFunction, Component, isLoading, threshold, rootMargin])

  if (error) {
    return <div className="text-red-500 p-4">Error loading component: {error.message}</div>
  }

  if (Component) {
    return <Component {...(props as any)} />
  }

  return (
    <div ref={ref} className="min-h-[200px]">
      {isLoading ? (fallback || <WidgetSkeleton />) : null}
    </div>
  )
}

// Progressive loading component with priority
interface ProgressiveLazyProps<T extends ComponentType<any>> extends Omit<LazyComponentProps<T>, 'preloadTriggers'> {
  priority?: 'high' | 'medium' | 'low'
}

export function ProgressiveLazy<T extends ComponentType<any>>({
  importFunction,
  fallback,
  priority = 'medium',
  children,
  ...props
}: ProgressiveLazyProps<T>) {
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
        await new Promise(resolve => setTimeout(resolve, 200))
      } else if (priority === 'medium') {
        await new Promise(resolve => setTimeout(resolve, 100))
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

  if (error) {
    return <div className="text-red-500 p-4">Error loading component: {error.message}</div>
  }

  if (Component) {
    return <Component {...(props as any)} />
  }

  if (isLoading) {
    return fallback || <WidgetSkeleton />
  }

  // For medium/low priority, show placeholder until loaded
  return (
    <div 
      className="cursor-pointer" 
      onClick={priority === 'low' ? loadComponent : undefined}
      onMouseEnter={priority === 'medium' ? loadComponent : undefined}
    >
      {priority === 'high' ? (fallback || <WidgetSkeleton />) : (
        <div className="p-4 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          {priority === 'low' ? 'Click to load' : 'Hover to load'}
        </div>
      )}
    </div>
  )
}
