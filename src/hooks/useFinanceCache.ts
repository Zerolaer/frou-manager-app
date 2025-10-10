import { useCallback } from 'react'
import { CACHE_KEYS } from '@/lib/constants'
import { logger } from '@/lib/monitoring'

interface CacheData {
  income: { id: string; name: string; values: number[]; parent_id?: string | null }[]
  expense: { id: string; name: string; values: number[]; parent_id?: string | null }[]
}

export function useFinanceCache() {
  const writeCache = useCallback((uid: string, year: number, data: CacheData) => {
    try {
      localStorage.setItem(CACHE_KEYS.FINANCE(uid, year), JSON.stringify(data))
    } catch (error) {
      logger.warn('Failed to write finance cache:', error)
    }
  }, [])

  const readCache = useCallback((uid: string, year: number): CacheData | null => {
    try {
      const raw = localStorage.getItem(CACHE_KEYS.FINANCE(uid, year))
      return raw ? JSON.parse(raw) : null
    } catch (error) {
      logger.warn('Failed to read finance cache:', error)
      return null
    }
  }, [])

  const clearCache = useCallback((uid: string, year: number) => {
    try {
      localStorage.removeItem(CACHE_KEYS.FINANCE(uid, year))
    } catch (error) {
      logger.warn('Failed to clear finance cache:', error)
    }
  }, [])

  return { writeCache, readCache, clearCache }
}
