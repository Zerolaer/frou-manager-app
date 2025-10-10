import { logger } from '@/lib/monitoring'

interface PendingRequest {
  promise: Promise<any>
  timestamp: number
  subscribers: number
}

interface RequestConfig {
  timeout?: number
  retries?: number
  retryDelay?: number
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest>()
  private requestHistory = new Map<string, { success: number; error: number }>()
  private readonly DEFAULT_TIMEOUT = 10000 // 10 seconds
  private readonly DEFAULT_RETRIES = 2
  private readonly DEFAULT_RETRY_DELAY = 1000 // 1 second
  private readonly CLEANUP_INTERVAL = 60000 // 1 minute

  constructor() {
    // Cleanup old requests periodically
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL)
  }

  private generateKey(queryKey: string, variables?: any): string {
    if (!variables) return queryKey
    return `${queryKey}:${JSON.stringify(variables)}`
  }

  private cleanup() {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes

    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > maxAge) {
        logger.debug('Cleaning up old request:', { key, age: now - request.timestamp })
        this.pendingRequests.delete(key)
      }
    }
  }

  async deduplicate<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    config: RequestConfig = {}
  ): Promise<T> {
    const key = this.generateKey(queryKey)
    const {
      timeout = this.DEFAULT_TIMEOUT,
      retries = this.DEFAULT_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY
    } = config

    // Check if request is already pending
    const existingRequest = this.pendingRequests.get(key)
    if (existingRequest) {
      existingRequest.subscribers++
      logger.debug('Request deduplicated:', { key, subscribers: existingRequest.subscribers })
      return existingRequest.promise
    }

    // Create new request
    const requestPromise = this.executeWithRetry(queryFn, retries, retryDelay)
    
    const pendingRequest: PendingRequest = {
      promise: requestPromise,
      timestamp: Date.now(),
      subscribers: 1
    }

    this.pendingRequests.set(key, pendingRequest)

    try {
      // Add timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout)
      })

      const result = await Promise.race([requestPromise, timeoutPromise])
      
      // Record success
      this.recordSuccess(key)
      
      return result
    } catch (error) {
      // Record error
      this.recordError(key)
      throw error
    } finally {
      // Cleanup
      const currentRequest = this.pendingRequests.get(key)
      if (currentRequest) {
        currentRequest.subscribers--
        if (currentRequest.subscribers <= 0) {
          this.pendingRequests.delete(key)
        }
      }
    }
  }

  private async executeWithRetry<T>(
    queryFn: () => Promise<T>,
    retries: number,
    retryDelay: number
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await queryFn()
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < retries) {
          logger.debug(`Request failed, retrying in ${retryDelay}ms:`, {
            attempt: attempt + 1,
            maxRetries: retries,
            error: lastError.message
          })
          await this.delay(retryDelay)
        }
      }
    }

    throw lastError || new Error('Request failed after all retries')
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private recordSuccess(key: string) {
    const history = this.requestHistory.get(key) || { success: 0, error: 0 }
    history.success++
    this.requestHistory.set(key, history)
  }

  private recordError(key: string) {
    const history = this.requestHistory.get(key) || { success: 0, error: 0 }
    history.error++
    this.requestHistory.set(key, history)
  }

  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      requestHistory: Object.fromEntries(this.requestHistory),
      pendingKeys: Array.from(this.pendingRequests.keys())
    }
  }

  clearHistory() {
    this.requestHistory.clear()
  }

  getSuccessRate(key: string): number {
    const history = this.requestHistory.get(key)
    if (!history) return 0
    
    const total = history.success + history.error
    return total === 0 ? 0 : (history.success / total) * 100
  }
}

// Global instance
export const requestDeduplicator = new RequestDeduplicator()

// Hook for React components
export function useRequestDeduplication<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  config?: RequestConfig
) {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const execute = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await requestDeduplicator.deduplicate(queryKey, queryFn, config)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Request failed'))
    } finally {
      setLoading(false)
    }
  }, [queryKey, queryFn, config])

  React.useEffect(() => {
    execute()
  }, [execute])

  return { data, loading, error, refetch: execute }
}

// Utility for batching multiple requests
export class RequestBatcher {
  private batches = new Map<string, {
    requests: Array<{ key: string; fn: () => Promise<any>; resolve: (value: any) => void; reject: (error: Error) => void }>
    timeout: NodeJS.Timeout
  }>()

  private readonly BATCH_DELAY = 50 // 50ms batching window

  async batch<T>(
    batchKey: string,
    requestKey: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const existingBatch = this.batches.get(batchKey)
      
      if (existingBatch) {
        // Add to existing batch
        existingBatch.requests.push({ key: requestKey, fn: requestFn, resolve, reject })
      } else {
        // Create new batch
        const batch = {
          requests: [{ key: requestKey, fn: requestFn, resolve, reject }],
          timeout: setTimeout(() => this.executeBatch(batchKey), this.BATCH_DELAY)
        }
        this.batches.set(batchKey, batch)
      }
    })
  }

  private async executeBatch(batchKey: string) {
    const batch = this.batches.get(batchKey)
    if (!batch) return

    this.batches.delete(batchKey)
    clearTimeout(batch.timeout)

    logger.debug(`Executing batch: ${batchKey}`, { requestCount: batch.requests.length })

    // Execute all requests in parallel
    const promises = batch.requests.map(async (request) => {
      try {
        const result = await request.fn()
        request.resolve(result)
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error('Request failed'))
      }
    })

    await Promise.allSettled(promises)
  }
}

export const requestBatcher = new RequestBatcher()

// Utility for request queuing
export class RequestQueue {
  private queue: Array<{
    fn: () => Promise<any>
    resolve: (value: any) => void
    reject: (error: Error) => void
    priority: number
  }> = []
  private processing = false
  private readonly MAX_CONCURRENT = 3
  private activeRequests = 0

  async enqueue<T>(
    requestFn: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn: requestFn,
        resolve,
        reject,
        priority
      })

      // Sort by priority (higher priority first)
      this.queue.sort((a, b) => b.priority - a.priority)

      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0 && this.activeRequests < this.MAX_CONCURRENT) {
      const request = this.queue.shift()
      if (!request) break

      this.activeRequests++
      
      // Process request asynchronously
      this.processRequest(request).finally(() => {
        this.activeRequests--
        this.processQueue()
      })
    }

    this.processing = false
  }

  private async processRequest(request: {
    fn: () => Promise<any>
    resolve: (value: any) => void
    reject: (error: Error) => void
  }) {
    try {
      const result = await request.fn()
      request.resolve(result)
    } catch (error) {
      request.reject(error instanceof Error ? error : new Error('Request failed'))
    }
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      processing: this.processing
    }
  }
}

export const requestQueue = new RequestQueue()
