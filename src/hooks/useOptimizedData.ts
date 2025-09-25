import { useState, useEffect, useCallback, useRef } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface UseOptimizedDataOptions {
  ttl?: number // Time to live in milliseconds
  staleWhileRevalidate?: boolean
  retryCount?: number
  retryDelay?: number
}

export function useOptimizedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: UseOptimizedDataOptions = {}
) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    staleWhileRevalidate = true,
    retryCount = 3,
    retryDelay = 1000
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map())
  const retryCountRef = useRef(0)

  const isStale = useCallback((entry: CacheEntry<T>) => {
    return Date.now() - entry.timestamp > entry.ttl
  }, [])

  const fetchData = useCallback(async (force = false) => {
    try {
      setError(null)
      
      // Check cache first
      const cached = cacheRef.current.get(key)
      if (cached && !isStale(cached) && !force) {
        setData(cached.data)
        setLoading(false)
        return cached.data
      }

      // If we have stale data and staleWhileRevalidate is true, show it while fetching
      if (cached && isStale(cached) && staleWhileRevalidate && !force) {
        setData(cached.data)
        setLoading(false)
      } else {
        setLoading(true)
      }

      // Fetch fresh data
      const freshData = await fetchFn()
      
      // Update cache
      cacheRef.current.set(key, {
        data: freshData,
        timestamp: Date.now(),
        ttl
      })
      
      setData(freshData)
      setLoading(false)
      retryCountRef.current = 0
      
      return freshData
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      
      if (retryCountRef.current < retryCount) {
        retryCountRef.current++
        setTimeout(() => fetchData(force), retryDelay * retryCountRef.current)
        return
      }
      
      setError(error)
      setLoading(false)
      retryCountRef.current = 0
    }
  }, [key, fetchFn, ttl, isStale, staleWhileRevalidate, retryCount, retryDelay])

  const invalidate = useCallback(() => {
    cacheRef.current.delete(key)
  }, [key])

  const refresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refresh,
    invalidate
  }
}

// Hook for prefetching data
export function usePrefetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl = 5 * 60 * 1000
) {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map())

  const prefetch = useCallback(async () => {
    const cached = cacheRef.current.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }

    try {
      const data = await fetchFn()
      cacheRef.current.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      })
      return data
    } catch (error) {
      console.warn(`Prefetch failed for ${key}:`, error)
      return null
    }
  }, [key, fetchFn, ttl])

  return { prefetch }
}

