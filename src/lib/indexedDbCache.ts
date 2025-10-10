// IndexedDB cache for persisting data across sessions
import { logger } from './monitoring'

const DB_NAME = 'frou-manager-cache'
const DB_VERSION = 1
const STORE_NAME = 'query-cache'

interface CacheEntry {
  key: string
  data: any
  timestamp: number
  ttl: number
}

class IndexedDBCache {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  async init(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        logger.error('IndexedDB failed to open:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })

    return this.initPromise
  }

  async get(key: string): Promise<CacheEntry | null> {
    try {
      await this.init()
      if (!this.db) return null

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(key)

        request.onsuccess = () => {
          const entry = request.result as CacheEntry | undefined
          
          if (!entry) {
            resolve(null)
            return
          }

          // Check if expired
          const age = Date.now() - entry.timestamp
          if (age > entry.ttl) {
            // Delete expired entry
            this.delete(key)
            resolve(null)
            return
          }

          resolve(entry)
        }

        request.onerror = () => {
          logger.error('Failed to get from IndexedDB:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      logger.error('IndexedDB get error:', error)
      return null
    }
  }

  async set(key: string, data: any, ttl: number): Promise<void> {
    try {
      await this.init()
      if (!this.db) return

      const entry: CacheEntry = {
        key,
        data,
        timestamp: Date.now(),
        ttl
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.put(entry)

        request.onsuccess = () => resolve()
        request.onerror = () => {
          logger.error('Failed to set in IndexedDB:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      logger.error('IndexedDB set error:', error)
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.init()
      if (!this.db) return

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.delete(key)

        request.onsuccess = () => resolve()
        request.onerror = () => {
          logger.error('Failed to delete from IndexedDB:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      logger.error('IndexedDB delete error:', error)
    }
  }

  async clear(): Promise<void> {
    try {
      await this.init()
      if (!this.db) return

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.clear()

        request.onsuccess = () => resolve()
        request.onerror = () => {
          logger.error('Failed to clear IndexedDB:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      logger.error('IndexedDB clear error:', error)
    }
  }

  async cleanExpired(): Promise<void> {
    try {
      await this.init()
      if (!this.db) return

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.openCursor()
        const now = Date.now()

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          
          if (cursor) {
            const entry = cursor.value as CacheEntry
            const age = now - entry.timestamp
            
            if (age > entry.ttl) {
              cursor.delete()
            }
            
            cursor.continue()
          } else {
            resolve()
          }
        }

        request.onerror = () => {
          logger.error('Failed to clean expired entries:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      logger.error('IndexedDB cleanExpired error:', error)
    }
  }
}

// Singleton instance
export const indexedDBCache = new IndexedDBCache()

// Clean expired entries on startup
if (typeof window !== 'undefined') {
  indexedDBCache.cleanExpired().catch(logger.error)
}

