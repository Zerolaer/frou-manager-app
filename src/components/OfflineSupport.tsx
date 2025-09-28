import React, { useState, useEffect, useCallback } from 'react'
import { AccessibleButton } from './AccessibleComponents'
import { announceToScreenReader } from '@/lib/accessibility'

// Hook for detecting online/offline status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        announceToScreenReader('Соединение восстановлено', 'polite')
        setWasOffline(false)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      announceToScreenReader('Соединение потеряно. Работа в автономном режиме', 'assertive')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  return { isOnline, wasOffline }
}

// Offline indicator component
export const OfflineIndicator: React.FC = () => {
  const { isOnline } = useOnlineStatus()
  const [showIndicator, setShowIndicator] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShowIndicator(true)
    } else {
      // Hide after 3 seconds when back online
      const timeout = setTimeout(() => {
        setShowIndicator(false)
      }, 3000)
      
      return () => clearTimeout(timeout)
    }
  }, [isOnline])

  if (!showIndicator) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white px-4 py-2 text-center text-sm">
      <div className="flex items-center justify-center gap-2">
        <span>⚠️</span>
        <span>
          {isOnline ? 'Соединение восстановлено' : 'Нет подключения к интернету'}
        </span>
      </div>
    </div>
  )
}

// Queue for offline operations
class OfflineQueue {
  private queue: Array<{
    id: string
    operation: () => Promise<any>
    timestamp: number
    retries: number
  }> = []
  private isProcessing = false

  add(operation: () => Promise<any>, id?: string) {
    const queueItem = {
      id: id || `operation_${Date.now()}_${Math.random()}`,
      operation,
      timestamp: Date.now(),
      retries: 0
    }
    
    this.queue.push(queueItem)
    this.saveToStorage()
    
    return queueItem.id
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) return
    
    this.isProcessing = true
    
    while (this.queue.length > 0) {
      const item = this.queue[0]
      
      try {
        await item.operation()
        this.queue.shift() // Remove successful operation
        this.saveToStorage()
      } catch (error) {
        item.retries++
        
        if (item.retries >= 3) {
          // Remove failed operation after 3 retries
          this.queue.shift()
          console.error('Operation failed after 3 retries:', item.id, error)
        } else {
          // Move to end of queue for retry
          this.queue.push(this.queue.shift()!)
        }
        
        this.saveToStorage()
        break // Stop processing on error
      }
    }
    
    this.isProcessing = false
  }

  clear() {
    this.queue = []
    this.saveToStorage()
  }

  getQueue() {
    return [...this.queue]
  }

  private saveToStorage() {
    try {
      localStorage.setItem('offlineQueue', JSON.stringify(this.queue))
    } catch (error) {
      console.error('Failed to save offline queue:', error)
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('offlineQueue')
      if (stored) {
        this.queue = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error)
    }
  }
}

// Global offline queue instance
const offlineQueue = new OfflineQueue()

// Hook for offline operations
export function useOfflineOperations() {
  const { isOnline } = useOnlineStatus()
  const [queueLength, setQueueLength] = useState(0)

  useEffect(() => {
    offlineQueue.loadFromStorage()
    setQueueLength(offlineQueue.getQueue().length)
  }, [])

  useEffect(() => {
    if (isOnline && queueLength > 0) {
      offlineQueue.process().then(() => {
        setQueueLength(offlineQueue.getQueue().length)
      })
    }
  }, [isOnline, queueLength])

  const addOfflineOperation = useCallback((operation: () => Promise<any>, id?: string) => {
    const operationId = offlineQueue.add(operation, id)
    setQueueLength(offlineQueue.getQueue().length)
    return operationId
  }, [])

  const processQueue = useCallback(async () => {
    await offlineQueue.process()
    setQueueLength(offlineQueue.getQueue().length)
  }, [])

  const clearQueue = useCallback(() => {
    offlineQueue.clear()
    setQueueLength(0)
  }, [])

  return {
    isOnline,
    queueLength,
    addOfflineOperation,
    processQueue,
    clearQueue
  }
}

// Offline queue indicator
export const OfflineQueueIndicator: React.FC = () => {
  const { queueLength, processQueue, clearQueue } = useOfflineOperations()
  const [isExpanded, setIsExpanded] = useState(false)

  if (queueLength === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">
            {queueLength} операций в очереди
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:text-gray-200"
            aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
        
        {isExpanded && (
          <div className="space-y-2">
            <p className="text-sm text-blue-100">
              Операции будут выполнены при восстановлении соединения
            </p>
            <div className="flex gap-2">
              <AccessibleButton
                variant="secondary"
                size="sm"
                onClick={processQueue}
                className="bg-blue-500 hover:bg-blue-400"
              >
                Попробовать сейчас
              </AccessibleButton>
              <AccessibleButton
                variant="ghost"
                size="sm"
                onClick={clearQueue}
                className="text-blue-100 hover:text-white"
              >
                Очистить
              </AccessibleButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Service Worker registration
export function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered: ', registration)
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError)
        })
    })
  }
}

// Cache-first strategy for API calls
export function createOfflineApiCall<T>(
  apiCall: () => Promise<T>,
  cacheKey: string,
  options: {
    cacheTimeout?: number
    offlineFallback?: T
  } = {}
) {
  const { cacheTimeout = 5 * 60 * 1000, offlineFallback } = options // 5 minutes default

  return async (): Promise<T> => {
    try {
      // Try to make the API call
      const result = await apiCall()
      
      // Cache the result
      const cacheData = {
        data: result,
        timestamp: Date.now()
      }
      
      try {
        localStorage.setItem(`cache_${cacheKey}`, JSON.stringify(cacheData))
      } catch (error) {
        console.warn('Failed to cache API result:', error)
      }
      
      return result
    } catch (error) {
      // If offline or API fails, try to get from cache
      try {
        const cached = localStorage.getItem(`cache_${cacheKey}`)
        if (cached) {
          const cacheData = JSON.parse(cached)
          
          // Check if cache is still valid
          if (Date.now() - cacheData.timestamp < cacheTimeout) {
            return cacheData.data
          }
        }
      } catch (cacheError) {
        console.warn('Failed to read from cache:', cacheError)
      }
      
      // Return offline fallback if available
      if (offlineFallback !== undefined) {
        return offlineFallback
      }
      
      throw error
    }
  }
}

// OfflineSupport React Component
const OfflineSupport: React.FC = () => {
  const { isOnline, wasOffline } = useOnlineStatus()

  if (isOnline) {
    return null // Don't show anything when online
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span className="text-sm font-medium">
          {wasOffline ? 'Соединение восстановлено' : 'Нет подключения к интернету'}
        </span>
      </div>
    </div>
  )
}

export default OfflineSupport
