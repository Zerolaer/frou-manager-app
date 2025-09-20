import { useState, useCallback } from 'react'
import { useErrorHandler } from '@/lib/errorHandler'

interface AsyncOperationState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useAsyncOperation<T = unknown>() {
  const { handleError } = useErrorHandler()
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const execute = useCallback(async (
    operation: () => Promise<T>,
    context?: string
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const result = await operation()
      setState({ data: result, loading: false, error: null })
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setState({ data: null, loading: false, error: err })
      handleError(err, context)
      throw err
    }
  }, [handleError])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    execute,
    reset
  }
}
