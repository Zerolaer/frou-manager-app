import { logger } from '@/lib/monitoring'
import { useState, useCallback, useRef } from 'react'
import { retry, retryStrategies, RetryOptions, RetryResult } from '@/lib/retryLogic'
import { useErrorHandler } from '@/lib/errorHandler'

// Hook for retry functionality
export function useRetry() {
  const { handleError } = useErrorHandler()
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T | null> => {
    setIsRetrying(true)
    setRetryCount(0)

    const result = await retry(operation, {
      ...options,
      onRetry: (attempt, error) => {
        setRetryCount(attempt)
        options.onRetry?.(attempt, error)
      }
    })

    setIsRetrying(false)

    if (result.success) {
      return result.data
    } else {
      handleError(result.error, 'Операция завершилась с ошибкой')
      return null
    }
  }, [handleError])

  return {
    executeWithRetry,
    isRetrying,
    retryCount
  }
}

// Hook for specific retry strategies
export function useRetryStrategies() {
  const { handleError } = useErrorHandler()

  const executeWithStrategy = useCallback(async <T>(
    operation: () => Promise<T>,
    strategy: keyof typeof retryStrategies,
    maxRetries = 3
  ): Promise<T | null> => {
    try {
      const result = await retryStrategies[strategy](operation, maxRetries)
      return result.data
    } catch (error) {
      handleError(error, `Ошибка при выполнении операции (стратегия: ${strategy})`)
      return null
    }
  }, [handleError])

  return {
    immediate: (operation: () => Promise<any>, maxRetries = 3) => 
      executeWithStrategy(operation, 'immediate', maxRetries),
    
    linear: (operation: () => Promise<any>, maxRetries = 3, delay = 1000) => 
      executeWithStrategy(operation, 'linear', maxRetries),
    
    exponential: (operation: () => Promise<any>, maxRetries = 3) => 
      executeWithStrategy(operation, 'exponential', maxRetries),
    
    networkOnly: (operation: () => Promise<any>, maxRetries = 3) => 
      executeWithStrategy(operation, 'networkOnly', maxRetries),
    
    serverErrors: (operation: () => Promise<any>, maxRetries = 3) => 
      executeWithStrategy(operation, 'serverErrors', maxRetries)
  }
}

// Hook for API operations with retry
export function useApiWithRetry() {
  const { executeWithRetry, isRetrying, retryCount } = useRetry()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const executeApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T | null> => {
    setIsLoading(true)
    setError(null)

    const result = await executeWithRetry(apiCall, {
      maxRetries: 3,
      baseDelay: 1000,
      retryCondition: (error: any) => {
        // Retry on network errors and 5xx server errors
        return (
          error?.code === 'NETWORK_ERROR' ||
          error?.code === 'TIMEOUT' ||
          (error?.status >= 500 && error?.status < 600) ||
          error?.status === 429
        )
      },
      onRetry: (attempt, error) => {
        logger.debug(`Retry attempt ${attempt} for API call:`, error)
      },
      ...options
    })

    setIsLoading(false)

    if (result === null) {
      setError(new Error('API call failed after retries'))
    }

    return result
  }, [executeWithRetry])

  return {
    executeApiCall,
    isLoading: isLoading || isRetrying,
    retryCount,
    error,
    clearError: () => setError(null)
  }
}

// Hook for optimistic updates with retry
export function useOptimisticRetry<T>(
  initialData: T,
  updateFn: (data: T, optimisticData: T) => Promise<T>
) {
  const [data, setData] = useState<T>(initialData)
  const [optimisticData, setOptimisticData] = useState<T | null>(null)
  const { executeWithRetry } = useRetry()

  const updateOptimistically = useCallback(async (newData: T) => {
    // Set optimistic data immediately
    setOptimisticData(newData)
    
    try {
      // Execute update with retry
      const result = await executeWithRetry(
        () => updateFn(data, newData),
        {
          maxRetries: 3,
          retryCondition: (error: any) => {
            // Only retry on network/server errors, not validation errors
            return (
              error?.code === 'NETWORK_ERROR' ||
              error?.status >= 500 ||
              error?.status === 429
            )
          }
        }
      )

      if (result !== null) {
        setData(result)
        setOptimisticData(null)
      } else {
        // Revert optimistic update on failure
        setOptimisticData(null)
      }
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticData(null)
    }
  }, [data, updateFn, executeWithRetry])

  return {
    data: optimisticData || data,
    isOptimistic: optimisticData !== null,
    updateOptimistically
  }
}

// Hook for polling with retry
export function usePollingWithRetry<T>(
  pollFn: () => Promise<T>,
  interval: number = 5000,
  options: RetryOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const { executeWithRetry } = useRetry()

  const startPolling = useCallback(() => {
    if (isPolling) return

    setIsPolling(true)
    setError(null)

    const poll = async () => {
      try {
        const result = await executeWithRetry(pollFn, {
          maxRetries: 2,
          baseDelay: 1000,
          retryCondition: (error: any) => {
            // Retry on network errors and temporary server errors
            return (
              error?.code === 'NETWORK_ERROR' ||
              error?.status >= 500 ||
              error?.status === 429
            )
          },
          ...options
        })

        if (result !== null) {
          setData(result)
          setError(null)
        }
      } catch (error) {
        setError(error instanceof Error ? error : new Error(String(error)))
      }
    }

    // Initial poll
    poll()

    // Set up interval
    intervalRef.current = setInterval(poll, interval)
  }, [isPolling, pollFn, interval, executeWithRetry, options])

  const stopPolling = useCallback(() => {
    setIsPolling(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  return {
    data,
    isPolling,
    error,
    startPolling,
    stopPolling
  }
}

// Import React for useEffect
import React from 'react'
