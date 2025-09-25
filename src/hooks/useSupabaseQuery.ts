import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface QueryOptions {
  enabled?: boolean
  refetchOnMount?: boolean
  staleTime?: number
  cacheTime?: number
}

interface QueryResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  invalidate: () => void
}

// Simple in-memory cache
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>()

export function useSupabaseQuery<T>(
  queryKey: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: QueryOptions = {}
) {
  const {
    enabled = true,
    refetchOnMount = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000 // 10 minutes
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)

  const isStale = useCallback((timestamp: number) => {
    return Date.now() - timestamp > staleTime
  }, [staleTime])

  const executeQuery = useCallback(async (force = false) => {
    if (!enabled) return

    try {
      setError(null)

      // Check cache first
      const cached = queryCache.get(queryKey)
      if (cached && !isStale(cached.timestamp) && !force) {
        setData(cached.data)
        setLoading(false)
        return
      }

      // If we have stale data, show it while fetching
      if (cached && isStale(cached.timestamp) && !force) {
        setData(cached.data)
        setLoading(false)
      } else {
        setLoading(true)
      }

      // Execute query
      const result = await queryFn()
      
      if (!mountedRef.current) return

      if (result.error) {
        throw new Error(result.error.message || 'Query failed')
      }

      // Update cache
      queryCache.set(queryKey, {
        data: result.data,
        timestamp: Date.now(),
        ttl: cacheTime
      })

      setData(result.data)
      setLoading(false)
    } catch (err) {
      if (!mountedRef.current) return
      
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      setLoading(false)
    }
  }, [queryKey, queryFn, enabled, isStale, cacheTime])

  const refetch = useCallback(() => {
    return executeQuery(true)
  }, [executeQuery])

  const invalidate = useCallback(() => {
    queryCache.delete(queryKey)
  }, [queryKey])

  useEffect(() => {
    if (enabled && refetchOnMount) {
      executeQuery()
    }
  }, [enabled, refetchOnMount, executeQuery])

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    data,
    loading,
    error,
    refetch,
    invalidate
  } as QueryResult<T>
}

// Hook for mutations
export function useSupabaseMutation<T, V = any>(
  mutationFn: (variables: V) => Promise<{ data: T | null; error: any }>,
  options: {
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
    invalidateQueries?: string[]
  } = {}
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = useCallback(async (variables: V) => {
    try {
      setLoading(true)
      setError(null)

      const result = await mutationFn(variables)

      if (result.error) {
        throw new Error(result.error.message || 'Mutation failed')
      }

      // Invalidate related queries
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach(key => {
          queryCache.delete(key)
        })
      }

      if (options.onSuccess && result.data) {
        options.onSuccess(result.data)
      }

      return result.data
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      
      if (options.onError) {
        options.onError(error)
      }
      
      throw error
    } finally {
      setLoading(false)
    }
  }, [mutationFn, options])

  return {
    mutate,
    loading,
    error
  }
}

// Utility to clear all cache
export function clearQueryCache() {
  queryCache.clear()
}

// Utility to get cache stats
export function getCacheStats() {
  return {
    size: queryCache.size,
    keys: Array.from(queryCache.keys())
  }
}

