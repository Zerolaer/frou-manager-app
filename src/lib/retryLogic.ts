// Retry logic for API requests and async operations
import { logger } from './monitoring'

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryCondition?: (error: any) => boolean
  onRetry?: (attempt: number, error: any) => void
}

export interface RetryResult<T> {
  data: T | null
  error: Error | null
  attempts: number
  success: boolean
}

// Default retry configuration
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error: any) => {
    // Retry on network errors, 5xx server errors, and rate limiting
    if (error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT') {
      return true
    }
    
    if (error?.status >= 500 && error?.status < 600) {
      return true
    }
    
    if (error?.status === 429) { // Too Many Requests
      return true
    }
    
    return false
  },
  onRetry: (attempt: number, error: any) => {
    logger.warn(`Retry attempt ${attempt} after error:`, error)
  }
}

// Calculate delay with exponential backoff and jitter
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1)
  const jitter = Math.random() * 0.1 * exponentialDelay // Add 10% jitter
  const delay = Math.min(exponentialDelay + jitter, options.maxDelay)
  
  return Math.floor(delay)
}

// Sleep function for delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Main retry function
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      const data = await operation()
      return {
        data,
        error: null,
        attempts: attempt,
        success: true
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry on last attempt
      if (attempt === config.maxRetries + 1) {
        break
      }
      
      // Check if we should retry this error
      if (!config.retryCondition(lastError)) {
        break
      }
      
      // Call retry callback
      config.onRetry(attempt, lastError)
      
      // Calculate delay and wait
      const delay = calculateDelay(attempt, config)
      await sleep(delay)
    }
  }
  
  return {
    data: null,
    error: lastError,
    attempts: config.maxRetries + 1,
    success: false
  }
}

// Retry with different strategies
export const retryStrategies = {
  // Immediate retry (no delay)
  immediate: (operation: () => Promise<any>, maxRetries = 3) => 
    retry(operation, { maxRetries, baseDelay: 0, maxDelay: 0 }),
  
  // Linear backoff
  linear: (operation: () => Promise<any>, maxRetries = 3, delay = 1000) => 
    retry(operation, { maxRetries, baseDelay: delay, backoffMultiplier: 1 }),
  
  // Exponential backoff (default)
  exponential: (operation: () => Promise<any>, maxRetries = 3) => 
    retry(operation, { maxRetries }),
  
  // Custom retry condition
  networkOnly: (operation: () => Promise<any>, maxRetries = 3) => 
    retry(operation, { 
      maxRetries, 
      retryCondition: (error: any) => 
        error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT'
    }),
  
  // Server errors only
  serverErrors: (operation: () => Promise<any>, maxRetries = 3) => 
    retry(operation, { 
      maxRetries, 
      retryCondition: (error: any) => 
        error?.status >= 500 && error?.status < 600
    })
}

// Circuit breaker pattern
export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private options: {
      failureThreshold: number
      timeout: number
      resetTimeout: number
    } = {
      failureThreshold: 5,
      timeout: 60000,
      resetTimeout: 30000
    }
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), this.options.timeout)
        )
      ])

      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failureCount = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    }
  }
}

// Timeout wrapper
export function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
    )
  ])
}

// Batch operations with retry
export async function retryBatch<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<Array<RetryResult<T>>> {
  const results = await Promise.allSettled(
    operations.map(operation => retry(operation, options))
  )

  return results.map(result => 
    result.status === 'fulfilled' 
      ? result.value 
      : {
          data: null,
          error: result.reason,
          attempts: 0,
          success: false
        }
  )
}

// Debounced retry for rapid failures
export function createDebouncedRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions & { debounceMs?: number } = {}
) {
  const { debounceMs = 1000, ...retryOptions } = options
  let timeoutId: NodeJS.Timeout | null = null
  let pendingPromise: Promise<RetryResult<T>> | null = null

  return (): Promise<RetryResult<T>> => {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(async () => {
        try {
          if (pendingPromise) {
            const result = await pendingPromise
            resolve(result)
          } else {
            pendingPromise = retry(operation, retryOptions)
            const result = await pendingPromise
            pendingPromise = null
            resolve(result)
          }
        } catch (error) {
          reject(error)
        }
      }, debounceMs)
    })
  }
}
