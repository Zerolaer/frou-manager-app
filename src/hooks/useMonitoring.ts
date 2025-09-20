import { useEffect, useCallback, useRef } from 'react'
import { logger, performanceMonitor, errorReporter, analytics } from '@/lib/monitoring'

// Hook for logging
export function useLogger() {
  const logDebug = useCallback((message: string, context?: any) => {
    logger.debug(message, context)
  }, [])

  const logInfo = useCallback((message: string, context?: any) => {
    logger.info(message, context)
  }, [])

  const logWarn = useCallback((message: string, context?: any) => {
    logger.warn(message, context)
  }, [])

  const logError = useCallback((message: string, context?: any) => {
    logger.error(message, context)
  }, [])

  const setLogLevel = useCallback((level: 'debug' | 'info' | 'warn' | 'error') => {
    logger.setLevel(level.toUpperCase() as any)
  }, [])

  const getLogs = useCallback((level?: 'debug' | 'info' | 'warn' | 'error') => {
    return logger.getLogs(level)
  }, [])

  const clearLogs = useCallback(() => {
    logger.clearLogs()
  }, [])

  return {
    logDebug,
    logInfo,
    logWarn,
    logError,
    setLogLevel,
    getLogs,
    clearLogs
  }
}

// Hook for performance monitoring
export function usePerformanceMonitoring() {
  const measureFunction = useCallback(<T>(name: string, fn: () => T): T => {
    return performanceMonitor.measureFunction(name, fn)
  }, [])

  const measureAsync = useCallback(async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    return performanceMonitor.measureAsync(name, fn)
  }, [])

  const recordMetric = useCallback((name: string, value: number, context?: any) => {
    performanceMonitor.recordMetric(name, value, context)
  }, [])

  const getMetrics = useCallback((name?: string) => {
    return performanceMonitor.getMetrics(name)
  }, [])

  const getAverageMetric = useCallback((name: string) => {
    return performanceMonitor.getAverageMetric(name)
  }, [])

  const clearMetrics = useCallback(() => {
    performanceMonitor.clearMetrics()
  }, [])

  return {
    measureFunction,
    measureAsync,
    recordMetric,
    getMetrics,
    getAverageMetric,
    clearMetrics
  }
}

// Hook for error reporting
export function useErrorReporting() {
  const reportError = useCallback((error: Error, context?: any) => {
    errorReporter.reportError(error, context)
  }, [])

  const getErrors = useCallback(() => {
    return errorReporter.getErrors()
  }, [])

  const clearErrors = useCallback(() => {
    errorReporter.clearErrors()
  }, [])

  return {
    reportError,
    getErrors,
    clearErrors
  }
}

// Hook for analytics
export function useAnalytics() {
  const track = useCallback((event: string, properties?: any) => {
    analytics.track(event, properties)
  }, [])

  const getEvents = useCallback(() => {
    return analytics.getEvents()
  }, [])

  const clearEvents = useCallback(() => {
    analytics.clearEvents()
  }, [])

  return {
    track,
    getEvents,
    clearEvents
  }
}

// Hook for component performance monitoring
export function useComponentPerformance(componentName: string) {
  const mountTime = useRef<number>(0)
  const renderCount = useRef<number>(0)

  useEffect(() => {
    mountTime.current = performance.now()
    renderCount.current = 0

    return () => {
      const unmountTime = performance.now()
      const totalTime = unmountTime - mountTime.current
      
      performanceMonitor.recordMetric(`component.${componentName}.lifetime`, totalTime)
      performanceMonitor.recordMetric(`component.${componentName}.renderCount`, renderCount.current)
    }
  }, [componentName])

  useEffect(() => {
    renderCount.current++
    const renderTime = performance.now()
    
    performanceMonitor.recordMetric(`component.${componentName}.render`, renderTime)
  })

  const measureRender = useCallback((renderFn: () => void) => {
    const start = performance.now()
    renderFn()
    const end = performance.now()
    
    performanceMonitor.recordMetric(`component.${componentName}.renderTime`, end - start)
  }, [componentName])

  return {
    measureRender,
    renderCount: renderCount.current
  }
}

// Hook for API call monitoring
export function useApiMonitoring() {
  const trackApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    endpoint: string,
    method: string = 'GET'
  ): Promise<T> => {
    const startTime = performance.now()
    
    try {
      const result = await apiCall()
      const endTime = performance.now()
      const duration = endTime - startTime
      
      performanceMonitor.recordMetric('api.call.success', duration, {
        endpoint,
        method,
        status: 'success'
      })
      
      analytics.track('api_call_success', {
        endpoint,
        method,
        duration
      })
      
      return result
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      performanceMonitor.recordMetric('api.call.error', duration, {
        endpoint,
        method,
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
      
      analytics.track('api_call_error', {
        endpoint,
        method,
        duration,
        error: error instanceof Error ? error.message : String(error)
      })
      
      throw error
    }
  }, [])

  return {
    trackApiCall
  }
}

// Hook for user interaction monitoring
export function useInteractionMonitoring() {
  const trackClick = useCallback((element: string, context?: any) => {
    analytics.track('click', {
      element,
      ...context
    })
  }, [])

  const trackView = useCallback((page: string, context?: any) => {
    analytics.track('page_view', {
      page,
      ...context
    })
  }, [])

  const trackFormSubmit = useCallback((form: string, context?: any) => {
    analytics.track('form_submit', {
      form,
      ...context
    })
  }, [])

  const trackSearch = useCallback((query: string, context?: any) => {
    analytics.track('search', {
      query,
      ...context
    })
  }, [])

  return {
    trackClick,
    trackView,
    trackFormSubmit,
    trackSearch
  }
}

// Hook for memory monitoring
export function useMemoryMonitoring() {
  const checkMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      
      performanceMonitor.recordMetric('memory.used', memory.usedJSHeapSize)
      performanceMonitor.recordMetric('memory.total', memory.totalJSHeapSize)
      performanceMonitor.recordMetric('memory.limit', memory.jsHeapSizeLimit)
      
      // Calculate memory usage percentage
      const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      performanceMonitor.recordMetric('memory.usagePercentage', usagePercentage)
      
      if (usagePercentage > 80) {
        logger.warn('High memory usage detected', {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          percentage: usagePercentage
        })
      }
    }
  }, [])

  useEffect(() => {
    // Check memory every 30 seconds
    const interval = setInterval(checkMemory, 30000)
    
    // Initial check
    checkMemory()
    
    return () => clearInterval(interval)
  }, [checkMemory])

  return {
    checkMemory
  }
}

// Hook for network monitoring
export function useNetworkMonitoring() {
  const trackNetworkRequest = useCallback((url: string, method: string, duration: number, status: number) => {
    performanceMonitor.recordMetric('network.request.duration', duration, {
      url,
      method,
      status
    })
    
    analytics.track('network_request', {
      url,
      method,
      duration,
      status
    })
  }, [])

  const trackNetworkError = useCallback((url: string, method: string, error: string) => {
    analytics.track('network_error', {
      url,
      method,
      error
    })
    
    logger.error('Network error', {
      url,
      method,
      error
    })
  }, [])

  return {
    trackNetworkRequest,
    trackNetworkError
  }
}

// Hook for comprehensive monitoring
export function useMonitoring() {
  const logger = useLogger()
  const performance = usePerformanceMonitoring()
  const errorReporting = useErrorReporting()
  const analytics = useAnalytics()
  const apiMonitoring = useApiMonitoring()
  const interactionMonitoring = useInteractionMonitoring()
  const memoryMonitoring = useMemoryMonitoring()
  const networkMonitoring = useNetworkMonitoring()

  return {
    logger,
    performance,
    errorReporting,
    analytics,
    apiMonitoring,
    interactionMonitoring,
    memoryMonitoring,
    networkMonitoring
  }
}

