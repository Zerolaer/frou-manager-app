/**
 * Hook for managing content transitions with View Transitions API
 * Provides smooth transitions between loading states
 */

import { useState, useCallback, useEffect } from 'react'

interface TransitionState {
  isLoading: boolean
  error: Error | null
  isEmpty: boolean
}

interface UseContentTransitionOptions {
  minLoadingTime?: number // Minimum time to show loading state (prevents flash)
  onTransitionComplete?: () => void
}

/**
 * Check if View Transitions API is supported
 */
function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document
}

/**
 * Execute callback with View Transition if supported
 */
function withViewTransition(callback: () => void): void {
  if (supportsViewTransitions()) {
    try {
      ;(document as any).startViewTransition(callback)
    } catch (e) {
      // Fallback to regular transition
      callback()
    }
  } else {
    callback()
  }
}

export function useContentTransition(options: UseContentTransitionOptions = {}) {
  const { minLoadingTime = 300, onTransitionComplete } = options

  const [state, setState] = useState<TransitionState>({
    isLoading: true,
    error: null,
    isEmpty: false
  })

  const [loadingStartTime, setLoadingStartTime] = useState<number>(0)

  /**
   * Start loading state
   */
  const startLoading = useCallback(() => {
    setLoadingStartTime(Date.now())
    withViewTransition(() => {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }))
    })
  }, [])

  /**
   * Complete loading with data
   */
  const completeLoading = useCallback((hasData: boolean = true) => {
    const elapsed = Date.now() - loadingStartTime
    const remainingTime = Math.max(0, minLoadingTime - elapsed)

    // Enforce minimum loading time to prevent flash
    setTimeout(() => {
      withViewTransition(() => {
        setState({
          isLoading: false,
          error: null,
          isEmpty: !hasData
        })
      })
      onTransitionComplete?.()
    }, remainingTime)
  }, [loadingStartTime, minLoadingTime, onTransitionComplete])

  /**
   * Set error state
   */
  const setError = useCallback((error: Error) => {
    withViewTransition(() => {
      setState({
        isLoading: false,
        error,
        isEmpty: false
      })
    })
  }, [])

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    withViewTransition(() => {
      setState({
        isLoading: true,
        error: null,
        isEmpty: false
      })
    })
  }, [])

  return {
    ...state,
    startLoading,
    completeLoading,
    setError,
    reset,
    supportsViewTransitions: supportsViewTransitions()
  }
}

/**
 * Hook for managing async data loading with transitions
 */
export function useAsyncContentLoader<T>(
  fetchFn: () => Promise<T>,
  options: UseContentTransitionOptions & {
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
    isEmpty?: (data: T) => boolean
  } = {}
) {
  const { onSuccess, onError, isEmpty = (data) => !data } = options
  const transition = useContentTransition(options)
  const [data, setData] = useState<T | null>(null)

  const load = useCallback(async () => {
    try {
      transition.startLoading()
      const result = await fetchFn()
      setData(result)
      transition.completeLoading(!isEmpty(result))
      onSuccess?.(result)
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      transition.setError(err)
      onError?.(err)
    }
  }, [fetchFn, transition, isEmpty, onSuccess, onError])

  useEffect(() => {
    load()
  }, [])

  return {
    data,
    ...transition,
    reload: load
  }
}

