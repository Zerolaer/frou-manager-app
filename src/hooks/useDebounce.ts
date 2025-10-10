import { useState, useEffect } from 'react'

/**
 * Debounce hook - delays updating value until user stops typing
 * 
 * Usage:
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState('')
 * const debouncedQuery = useDebounce(searchQuery, 300)
 * 
 * // searchQuery updates immediately (for input value)
 * // debouncedQuery updates after 300ms delay (for actual search)
 * 
 * useEffect(() => {
 *   performSearch(debouncedQuery)
 * }, [debouncedQuery])
 * ```
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500)
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set up timeout to update debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clear timeout if value changes before delay
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Debounced callback hook
 * 
 * Usage:
 * ```tsx
 * const debouncedSearch = useDebouncedCallback(
 *   (query: string) => performSearch(query),
 *   300
 * )
 * 
 * <input onChange={(e) => debouncedSearch(e.target.value)} />
 * ```
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  return (...args: Parameters<T>) => {
    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // Set new timeout
    const id = setTimeout(() => {
      callback(...args)
    }, delay)

    setTimeoutId(id)
  }
}

