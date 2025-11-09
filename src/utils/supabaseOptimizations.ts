import React from 'react'
import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/lib/monitoring'
import { requestBatcher, requestQueue } from './requestDeduplication'

interface BatchOperation<T> {
  table: string
  operation: 'insert' | 'update' | 'delete' | 'upsert'
  data: T
  filter?: any
}

interface OptimizedQuery {
  table: string
  select?: string
  filters?: Record<string, any>
  orderBy?: string
  limit?: number
  offset?: number
}

class SupabaseOptimizer {
  private batchQueue = new Map<string, BatchOperation<any>[]>()
  private readonly BATCH_SIZE = 50
  private readonly BATCH_DELAY = 100 // 100ms

  // Batch multiple operations together
  async batchOperations<T>(operations: BatchOperation<T>[]): Promise<any[]> {
    const results: any[] = []
    
    // Group operations by table
    const groupedOps = new Map<string, BatchOperation<T>[]>()
    
    for (const op of operations) {
      if (!groupedOps.has(op.table)) {
        groupedOps.set(op.table, [])
      }
      groupedOps.get(op.table)!.push(op)
    }

    // Execute batches for each table
    for (const [table, tableOps] of groupedOps) {
      const batches = this.chunkArray(tableOps, this.BATCH_SIZE)
      
      for (const batch of batches) {
        try {
          const result = await this.executeBatch(table, batch)
          results.push(...result)
        } catch (error) {
          logger.error(`Batch operation failed for table ${table}:`, error)
          throw error
        }
      }
    }

    return results
  }

  private async executeBatch<T>(table: string, operations: BatchOperation<T>[]): Promise<any[]> {
    // Separate operations by type
    const inserts = operations.filter(op => op.operation === 'insert' || op.operation === 'upsert')
    const updates = operations.filter(op => op.operation === 'update')
    const deletes = operations.filter(op => op.operation === 'delete')

    const results: any[] = []

    // Execute inserts/upserts
    if (inserts.length > 0) {
      const insertData = inserts.map(op => op.data)
      const upsertData = inserts.filter(op => op.operation === 'upsert').map(op => op.data)
      
      if (insertData.length > 0) {
        const { data, error } = await supabase.from(table).insert(insertData)
        if (error) throw error
        results.push(...(data || []))
      }
      
      if (upsertData.length > 0) {
        const { data, error } = await supabase.from(table).upsert(upsertData)
        if (error) throw error
        results.push(...(data || []))
      }
    }

    // Execute updates
    for (const update of updates) {
      let query = supabase.from(table).update(update.data)
      
      if (update.filter) {
        Object.entries(update.filter).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }
      
      const { data, error } = await query
      if (error) throw error
      results.push(...(data || []))
    }

    // Execute deletes
    for (const deleteOp of deletes) {
      let query = supabase.from(table).delete()
      
      if (deleteOp.filter) {
        Object.entries(deleteOp.filter).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }
      
      const { data, error } = await query
      if (error) throw error
      results.push(...(data || []))
    }

    return results
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  // Optimized query with intelligent caching
  async optimizedQuery<T>(query: OptimizedQuery): Promise<{ data: T[] | null; error: any }> {
    const cacheKey = this.generateQueryKey(query)
    
    try {
      let supabaseQuery: any = supabase.from(query.table)
      
      if (query.select) {
        supabaseQuery = supabaseQuery.select(query.select)
      }
      
      if (query.filters) {
        Object.entries(query.filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            supabaseQuery = supabaseQuery.in(key, value)
          } else {
            supabaseQuery = supabaseQuery.eq(key, value)
          }
        })
      }
      
      if (query.orderBy) {
        supabaseQuery = supabaseQuery.order(query.orderBy)
      }
      
      if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit)
      }
      
      if (query.offset) {
        supabaseQuery = supabaseQuery.range(query.offset, query.offset + (query.limit || 1000) - 1)
      }

      const { data, error } = await supabaseQuery
      
      if (error) {
        logger.error(`Optimized query failed for table ${query.table}:`, error)
      }
      
      return { data, error }
    } catch (error) {
      logger.error(`Optimized query error for table ${query.table}:`, error)
      return { data: null, error }
    }
  }

  private generateQueryKey(query: OptimizedQuery): string {
    return JSON.stringify(query)
  }

  // Optimized subscription with connection pooling
  subscribeToChanges<T>(
    table: string,
    callback: (payload: any) => void,
    filters?: Record<string, any>
  ) {
    let subscription = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table,
        filter: filters ? Object.entries(filters).map(([key, value]) => `${key}=eq.${value}`).join(',') : undefined
      }, callback)
      .subscribe()

    return {
      unsubscribe: () => {
        subscription.unsubscribe()
      }
    }
  }

  // Connection pooling for multiple queries
  async executeMultipleQueries<T>(queries: OptimizedQuery[]): Promise<{ data: T[] | null; error: any }[]> {
    const results = await Promise.allSettled(
      queries.map(query => this.optimizedQuery<T>(query))
    )

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        logger.error('Query execution failed:', result.reason)
        return { data: null, error: result.reason }
      }
    })
  }

  // Optimized real-time subscriptions with batching
  subscribeToMultipleTables<T>(
    subscriptions: Array<{
      table: string
      callback: (payload: any) => void
      filters?: Record<string, any>
    }>
  ) {
    const channel = supabase.channel('multi-table-changes')
    
    subscriptions.forEach(sub => {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: sub.table,
        filter: sub.filters ? Object.entries(sub.filters).map(([key, value]) => `${key}=eq.${value}`).join(',') : undefined
      }, sub.callback)
    })

    channel.subscribe()

    return {
      unsubscribe: () => {
        channel.unsubscribe()
      }
    }
  }
}

export const supabaseOptimizer = new SupabaseOptimizer()

// Hook for optimized Supabase queries
export function useOptimizedSupabaseQuery<T>(
  query: OptimizedQuery,
  options: {
    enabled?: boolean
    refetchInterval?: number
    staleTime?: number
  } = {}
) {
  const [data, setData] = React.useState<T[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<any>(null)
  const [lastFetch, setLastFetch] = React.useState<number>(0)

  const { enabled = true, refetchInterval, staleTime = 300000 } = options // 5 minutes default

  const fetchData = React.useCallback(async () => {
    if (!enabled) return

    try {
      setLoading(true)
      setError(null)

      const result = await supabaseOptimizer.optimizedQuery<T>(query)
      
      if (result.error) {
        setError(result.error)
      } else {
        setData(result.data)
        setLastFetch(Date.now())
      }
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [query, enabled])

  React.useEffect(() => {
    if (enabled) {
      fetchData()
    }
  }, [fetchData, enabled])

  // Refetch interval
  React.useEffect(() => {
    if (!refetchInterval) return

    const interval = setInterval(() => {
      const now = Date.now()
      if (now - lastFetch > staleTime) {
        fetchData()
      }
    }, refetchInterval)

    return () => clearInterval(interval)
  }, [refetchInterval, lastFetch, staleTime, fetchData])

  return { data, loading, error, refetch: fetchData }
}

// Hook for batch operations
export function useBatchOperations() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<any>(null)

  const executeBatch = React.useCallback(async <T>(operations: BatchOperation<T>[]) => {
    try {
      setLoading(true)
      setError(null)

      const results = await supabaseOptimizer.batchOperations(operations)
      return results
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { executeBatch, loading, error }
}

// Hook for real-time subscriptions
export function useRealtimeSubscription<T>(
  table: string,
  callback: (payload: any) => void,
  filters?: Record<string, any>
) {
  React.useEffect(() => {
    const subscription = supabaseOptimizer.subscribeToChanges(table, callback, filters)
    
    return () => {
      subscription.unsubscribe()
    }
  }, [table, callback, filters])
}
