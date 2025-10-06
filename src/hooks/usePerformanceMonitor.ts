import { useEffect, useRef, useCallback } from 'react'
import { isDevelopment } from '@/lib/env'

interface PerformanceMetrics {
  renderTime: number
  memoryUsage?: number
  componentName: string
  timestamp: number
}

interface PerformanceOptions {
  enabled?: boolean
  logThreshold?: number
  maxEntries?: number
}

export function usePerformanceMonitor(
  componentName: string,
  options: PerformanceOptions = {}
) {
  const { enabled = isDevelopment(), logThreshold = 16, maxEntries = 100 } = options
  const renderStartRef = useRef<number>()
  const metricsRef = useRef<PerformanceMetrics[]>([])

  useEffect(() => {
    if (!enabled) return

    renderStartRef.current = performance.now()
  })

  useEffect(() => {
    if (!enabled || !renderStartRef.current) return

    const renderTime = performance.now() - renderStartRef.current
    const memoryUsage = (performance as any).memory?.usedJSHeapSize

    const metric: PerformanceMetrics = {
      renderTime,
      memoryUsage,
      componentName,
      timestamp: Date.now()
    }

    metricsRef.current.push(metric)

    // Keep only recent entries
    if (metricsRef.current.length > maxEntries) {
      metricsRef.current = metricsRef.current.slice(-maxEntries)
    }

    // Log slow renders
    if (renderTime > logThreshold) {
      console.warn(`Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`)
    }

    // Log memory usage if available
    if (memoryUsage && memoryUsage > 50 * 1024 * 1024) { // 50MB
      console.warn(`High memory usage in ${componentName}: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`)
    }
  })

  const getMetrics = useCallback(() => {
    return [...metricsRef.current]
  }, [])

  const getAverageRenderTime = useCallback(() => {
    const metrics = metricsRef.current
    if (metrics.length === 0) return 0
    return metrics.reduce((sum, metric) => sum + metric.renderTime, 0) / metrics.length
  }, [])

  const clearMetrics = useCallback(() => {
    metricsRef.current = []
  }, [])

  return {
    getMetrics,
    getAverageRenderTime,
    clearMetrics
  }
}

// Hook for measuring async operations
export function useAsyncPerformance() {
  const operationsRef = useRef<Map<string, { start: number; end?: number }>>(new Map())

  const startOperation = useCallback((operationId: string) => {
    operationsRef.current.set(operationId, { start: performance.now() })
  }, [])

  const endOperation = useCallback((operationId: string) => {
    const operation = operationsRef.current.get(operationId)
    if (operation) {
      operation.end = performance.now()
      const duration = operation.end - operation.start
      
      if (duration > 1000) { // Log operations longer than 1 second
        console.warn(`Slow async operation ${operationId}: ${duration.toFixed(2)}ms`)
      }
      
      return duration
    }
    return 0
  }, [])

  const getOperationDuration = useCallback((operationId: string) => {
    const operation = operationsRef.current.get(operationId)
    if (operation && operation.end) {
      return operation.end - operation.start
    }
    return null
  }, [])

  const clearOperations = useCallback(() => {
    operationsRef.current.clear()
  }, [])

  return {
    startOperation,
    endOperation,
    getOperationDuration,
    clearOperations
  }
}

// Hook for monitoring bundle size and loading performance
export function useBundleAnalyzer() {
  useEffect(() => {
    if (!isDevelopment()) return

    // Monitor resource loading
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming
          if (resource.duration > 1000) { // Resources taking more than 1 second
            console.warn(`Slow resource load: ${resource.name} (${resource.duration.toFixed(2)}ms)`)
          }
        }
      })
    })

    observer.observe({ entryTypes: ['resource'] })

    // Monitor navigation timing
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.navigationStart
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart
        
        console.log(`Page load time: ${loadTime.toFixed(2)}ms`)
        console.log(`DOM content loaded: ${domContentLoaded.toFixed(2)}ms`)
        
        if (loadTime > 3000) {
          console.warn(`Slow page load: ${loadTime.toFixed(2)}ms`)
        }
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [])
}

// Hook for detecting memory leaks
export function useMemoryLeakDetector(componentName: string) {
  const refsRef = useRef<Set<WeakRef<any>>>(new Set())

  useEffect(() => {
    if (!isDevelopment()) return

    const interval = setInterval(() => {
      const refs = refsRef.current
      let activeRefs = 0
      let clearedRefs = 0

      refs.forEach((ref) => {
        if (ref.deref()) {
          activeRefs++
        } else {
          clearedRefs++
        }
      })

      // Clean up cleared refs
      refsRef.current = new Set([...refs].filter(ref => ref.deref()))

      // Log if there are many active refs
      if (activeRefs > 100) {
        console.warn(`Potential memory leak in ${componentName}: ${activeRefs} active refs`)
      }
    }, 30000) // Check every 30 seconds

    return () => {
      clearInterval(interval)
    }
  }, [componentName])

  const trackRef = useCallback((obj: any) => {
    if (!isDevelopment()) return
    refsRef.current.add(new WeakRef(obj))
  }, [])

  return { trackRef }
}

// Hook for optimizing re-renders
export function useRenderOptimization(componentName: string) {
  const renderCountRef = useRef(0)
  const lastPropsRef = useRef<any>(null)

  useEffect(() => {
    renderCountRef.current++
    
    if (renderCountRef.current > 10) {
      console.warn(`Frequent re-renders in ${componentName}: ${renderCountRef.current} renders`)
    }
  })

  const checkPropsChange = useCallback((props: any) => {
    const lastProps = lastPropsRef.current
    
    if (lastProps) {
      const changedProps = Object.keys(props).filter(key => props[key] !== lastProps[key])
      if (changedProps.length > 0) {
        console.log(`Props changed in ${componentName}:`, changedProps)
      }
    }
    
    lastPropsRef.current = props
  }, [componentName])

  return {
    renderCount: renderCountRef.current,
    checkPropsChange
  }
}
