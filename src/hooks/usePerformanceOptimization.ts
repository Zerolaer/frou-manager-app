import { useCallback, useMemo, useRef, useEffect } from 'react'

// Hook for debouncing expensive operations
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const callbackRef = useRef(callback)
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay, ...deps]
  ) as T

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

// Hook for throttling expensive operations
export function useThrottleCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const lastRunRef = useRef<number>(0)
  const callbackRef = useRef(callback)
  
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastRunRef.current >= delay) {
        callbackRef.current(...args)
        lastRunRef.current = now
      }
    },
    [delay, ...deps]
  ) as T

  return throttledCallback
}

// Hook for memoizing expensive calculations
export function useExpensiveCalculation<T>(
  calculation: () => T,
  deps: React.DependencyList,
  options?: {
    enabled?: boolean
    fallback?: T
  }
): T {
  const { enabled = true, fallback } = options || {}
  
  return useMemo(() => {
    if (!enabled) {
      return fallback as T
    }
    
    try {
      return calculation()
    } catch (error) {
      console.warn('Expensive calculation failed:', error)
      return fallback as T
    }
  }, deps)
}

// Hook for batching state updates
export function useBatchedState<T>(
  initialState: T
): [T, (updates: Partial<T> | ((prev: T) => T)) => void] {
  const [state, setState] = React.useState(initialState)
  
  const batchUpdate = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
    setState(prev => {
      if (typeof updates === 'function') {
        return updates(prev)
      }
      return { ...prev, ...updates }
    })
  }, [])
  
  return [state, batchUpdate]
}

// Hook for measuring component render performance
export function useRenderTimer(componentName: string) {
  const renderStartRef = useRef<number>()
  
  useEffect(() => {
    renderStartRef.current = performance.now()
  })
  
  useEffect(() => {
    if (renderStartRef.current) {
      const renderTime = performance.now() - renderStartRef.current
      if (renderTime > 16) { // Log if render takes more than one frame
        console.warn(`Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`)
      }
    }
  })
}

// Hook for preventing unnecessary re-renders
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList = []
): T {
  const callbackRef = useRef(callback)
  
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])
  
  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args)
  }, deps) as T
}

// Import React for hooks
import React from 'react'
