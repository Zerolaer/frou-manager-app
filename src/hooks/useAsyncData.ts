import { useState, useEffect, useCallback } from 'react'
import { useErrorHandler } from '@/lib/errorHandler'

interface AsyncDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const { handleError } = useErrorHandler()
  const [state, setState] = useState<AsyncDataState<T>>({
    data: null,
    loading: true,
    error: null
  })

  const refetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const result = await fetchFn()
      setState({ data: result, loading: false, error: null })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setState({ data: null, loading: false, error: err })
      handleError(err, 'Загрузка данных')
    }
  }, [fetchFn, handleError])

  useEffect(() => {
    refetch()
  }, deps)

  return {
    ...state,
    refetch
  }
}

// Hook for mutations with optimistic updates
export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>
) {
  const { handleError, handleSuccess } = useErrorHandler()
  const [state, setState] = useState<AsyncDataState<TData>>({
    data: null,
    loading: false,
    error: null
  })

  const mutate = useCallback(async (
    variables: TVariables,
    context?: string
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const result = await mutationFn(variables)
      setState({ data: result, loading: false, error: null })
      handleSuccess(context || 'Операция выполнена успешно')
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setState({ data: null, loading: false, error: err })
      handleError(err, context || 'Ошибка операции')
      throw err
    }
  }, [mutationFn, handleError, handleSuccess])

  return {
    ...state,
    mutate
  }
}
