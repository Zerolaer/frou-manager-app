import { supabase } from './supabaseClient'

/**
 * Batch multiple Supabase requests into a single Promise.all
 * 
 * Usage:
 * ```tsx
 * const [projects, tasks, notes] = await batchRequests([
 *   () => supabase.from('tasks_projects').select(),
 *   () => supabase.from('tasks_items').select(),
 *   () => supabase.from('notes').select()
 * ])
 * 
 * if (projects.error) handleError(projects.error)
 * if (tasks.error) handleError(tasks.error)
 * ```
 */
export async function batchRequests<T extends any[]>(
  requests: Array<() => Promise<any>>
): Promise<T> {
  const results = await Promise.all(
    requests.map(async (request) => {
      try {
        return await request()
      } catch (error) {
        return { data: null, error }
      }
    })
  )
  
  return results as T
}

/**
 * Retry logic with exponential backoff
 * 
 * Usage:
 * ```tsx
 * const { data, error } = await retryRequest(
 *   () => supabase.from('tasks_items').select(),
 *   { maxRetries: 3, backoff: 'exponential' }
 * )
 * ```
 */
export async function retryRequest<T>(
  request: () => Promise<T>,
  options: {
    maxRetries?: number
    backoff?: 'linear' | 'exponential'
    initialDelay?: number
    onRetry?: (attempt: number, error: any) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    backoff = 'exponential',
    initialDelay = 1000,
    onRetry
  } = options

  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await request()
    } catch (error) {
      lastError = error
      
      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break
      }

      // Calculate delay
      const delay = backoff === 'exponential'
        ? initialDelay * Math.pow(2, attempt)
        : initialDelay * (attempt + 1)

      // Callback before retry
      onRetry?.(attempt + 1, error)

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Request deduplication cache
 * Prevents multiple identical requests from running simultaneously
 */
const pendingRequests = new Map<string, Promise<any>>()

/**
 * Deduplicated request - if same request is pending, return the pending promise
 * 
 * Usage:
 * ```tsx
 * const data = await deduplicatedRequest(
 *   'tasks-2024-01-01',
 *   () => supabase.from('tasks_items').select().eq('date', '2024-01-01')
 * )
 * ```
 */
export async function deduplicatedRequest<T>(
  key: string,
  request: () => Promise<T>
): Promise<T> {
  // Check if request is already pending
  if (pendingRequests.has(key)) {
    return await pendingRequests.get(key) as T
  }

  // Execute request
  const promise = request()
  pendingRequests.set(key, promise)

  try {
    const result = await promise
    return result
  } finally {
    // Clean up after request completes
    pendingRequests.delete(key)
  }
}

/**
 * Combined: Batch + Retry + Dedup
 * 
 * Usage:
 * ```tsx
 * const [projects, tasks] = await optimizedBatchRequests([
 *   { key: 'projects', fn: () => supabase.from('tasks_projects').select() },
 *   { key: 'tasks-week', fn: () => supabase.from('tasks_items').select() }
 * ], { maxRetries: 2 })
 * ```
 */
export async function optimizedBatchRequests<T extends any[]>(
  requests: Array<{ key: string; fn: () => Promise<any> }>,
  retryOptions?: Parameters<typeof retryRequest>[1]
): Promise<T> {
  const results = await Promise.all(
    requests.map(({ key, fn }) =>
      deduplicatedRequest(
        key,
        () => retryRequest(fn, retryOptions)
      )
    )
  )

  return results as T
}

