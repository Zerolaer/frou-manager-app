// Cache performance monitoring utility
import { isDevelopment } from './env'

interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  totalRequests: number
}

class CacheMonitor {
  private stats: Map<string, CacheStats> = new Map()
  private enabled = isDevelopment()

  recordHit(cacheName: string) {
    if (!this.enabled) return
    
    const stats = this.getStats(cacheName)
    stats.hits++
    stats.totalRequests++
    stats.hitRate = (stats.hits / stats.totalRequests) * 100
    this.stats.set(cacheName, stats)
  }

  recordMiss(cacheName: string) {
    if (!this.enabled) return
    
    const stats = this.getStats(cacheName)
    stats.misses++
    stats.totalRequests++
    stats.hitRate = (stats.hits / stats.totalRequests) * 100
    this.stats.set(cacheName, stats)
  }

  private getStats(cacheName: string): CacheStats {
    return this.stats.get(cacheName) || {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0
    }
  }

  getReport() {
    if (!this.enabled) return null
    
    const report: Record<string, CacheStats> = {}
    this.stats.forEach((stats, name) => {
      report[name] = stats
    })
    return report
  }

  logReport() {
    if (!this.enabled) return
    
    console.group('📊 Cache Performance Report')
    this.stats.forEach((stats, name) => {
      console.log(`${name}:`, {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: `${stats.hitRate.toFixed(2)}%`,
        total: stats.totalRequests
      })
    })
    console.groupEnd()
  }

  reset() {
    this.stats.clear()
  }
}

export const cacheMonitor = new CacheMonitor()

// Auto-log report every minute in development
if (isDevelopment() && typeof window !== 'undefined') {
  setInterval(() => {
    cacheMonitor.logReport()
  }, 60000)
}

// Expose to window for manual debugging
if (isDevelopment() && typeof window !== 'undefined') {
  (window as any).__cacheMonitor = cacheMonitor
}

