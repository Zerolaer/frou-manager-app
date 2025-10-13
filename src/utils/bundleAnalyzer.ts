import { logger } from '@/lib/monitoring'
import { isDevelopment } from '@/lib/env'

interface BundleStats {
  name: string
  size: number
  gzippedSize?: number
  type: 'vendor' | 'feature' | 'page' | 'ui' | 'utils'
  priority: 'high' | 'medium' | 'low'
}

interface PerformanceMetrics {
  firstContentfulPaint?: number
  largestContentfulPaint?: number
  firstInputDelay?: number
  cumulativeLayoutShift?: number
  bundleLoadTime?: number
}

export class BundleAnalyzer {
  private stats: BundleStats[] = []
  private performanceMetrics: PerformanceMetrics = {}
  private isAnalyzing = false

  constructor() {
    if (!isDevelopment()) {
      this.initializeBundleAnalysis()
      this.initializePerformanceObserver()
    }
  }

  private initializeBundleAnalysis() {
    // Monitor bundle loading
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      
      entries.forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming
          
          if (resource.name.includes('.js') || resource.name.includes('.css')) {
            const bundleStats = this.analyzeBundle(resource)
            if (bundleStats) {
              this.stats.push(bundleStats)
              this.logBundleStats(bundleStats)
            }
          }
        }
      })
    })

    observer.observe({ entryTypes: ['resource'] })
  }

  private initializePerformanceObserver() {
    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      
      entries.forEach((entry) => {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              this.performanceMetrics.firstContentfulPaint = entry.startTime
            }
            break
          case 'largest-contentful-paint':
            this.performanceMetrics.largestContentfulPaint = entry.startTime
            break
          case 'first-input':
            this.performanceMetrics.firstInputDelay = entry.processingStart - entry.startTime
            break
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              this.performanceMetrics.cumulativeLayoutShift = 
                (this.performanceMetrics.cumulativeLayoutShift || 0) + (entry as any).value
            }
            break
        }
      })
    })

    observer.observe({ 
      entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] 
    })
  }

  private analyzeBundle(resource: PerformanceResourceTiming): BundleStats | null {
    const url = new URL(resource.name)
    const filename = url.pathname.split('/').pop() || ''
    
    // Determine bundle type and priority
    let type: BundleStats['type'] = 'vendor'
    let priority: BundleStats['priority'] = 'medium'
    let name = filename

    if (filename.includes('vendor-react')) {
      type = 'vendor'
      priority = 'high'
      name = 'React Ecosystem'
    } else if (filename.includes('vendor-supabase')) {
      type = 'vendor'
      priority = 'high'
      name = 'Supabase'
    } else if (filename.includes('vendor-icons')) {
      type = 'vendor'
      priority = 'low'
      name = 'Lucide Icons'
    } else if (filename.includes('page-')) {
      type = 'page'
      priority = 'medium'
      name = filename.replace('page-', '').replace('.js', '')
    } else if (filename.includes('feature-')) {
      type = 'feature'
      priority = 'medium'
      name = filename.replace('feature-', '').replace('.js', '')
    } else if (filename.includes('ui-components')) {
      type = 'ui'
      priority = 'high'
      name = 'UI Components'
    } else if (filename.includes('app-utils')) {
      type = 'utils'
      priority = 'high'
      name = 'App Utilities'
    }

    return {
      name,
      size: resource.transferSize,
      type,
      priority
    }
  }

  private logBundleStats(stats: BundleStats) {
    const sizeKB = (stats.size / 1024).toFixed(2)
    const priorityIcon = stats.priority === 'high' ? '🔴' : stats.priority === 'medium' ? '🟡' : '🟢'
    
    logger.info(`Bundle loaded: ${priorityIcon} ${stats.name} (${sizeKB}KB)`, {
      type: stats.type,
      priority: stats.priority,
      size: stats.size
    })
  }

  public getBundleStats(): BundleStats[] {
    return [...this.stats]
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics }
  }

  public getBundleSummary() {
    const totalSize = this.stats.reduce((sum, stat) => sum + stat.size, 0)
    const vendorSize = this.stats
      .filter(stat => stat.type === 'vendor')
      .reduce((sum, stat) => sum + stat.size, 0)
    const featureSize = this.stats
      .filter(stat => stat.type === 'feature')
      .reduce((sum, stat) => sum + stat.size, 0)

    return {
      totalBundles: this.stats.length,
      totalSize: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      vendorSize: vendorSize,
      vendorSizeKB: (vendorSize / 1024).toFixed(2),
      featureSize: featureSize,
      featureSizeKB: (featureSize / 1024).toFixed(2),
      vendorPercentage: ((vendorSize / totalSize) * 100).toFixed(1)
    }
  }

  public logPerformanceReport() {
    const summary = this.getBundleSummary()
    const metrics = this.getPerformanceMetrics()

    logger.info('🚀 Bundle Performance Report', {
      summary,
      metrics,
      recommendations: this.getRecommendations(summary, metrics)
    })
  }

  private getRecommendations(summary: any, metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = []

    if (summary.vendorPercentage > 70) {
      recommendations.push('Consider code splitting vendor libraries')
    }

    if (summary.totalSizeKB > 1000) {
      recommendations.push('Bundle size is large, consider lazy loading more components')
    }

    if (metrics.firstContentfulPaint && metrics.firstContentfulPaint > 1500) {
      recommendations.push('First Contentful Paint is slow, optimize critical path')
    }

    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) {
      recommendations.push('Largest Contentful Paint is slow, optimize images and fonts')
    }

    if (metrics.firstInputDelay && metrics.firstInputDelay > 100) {
      recommendations.push('First Input Delay is high, reduce JavaScript execution time')
    }

    if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) {
      recommendations.push('Cumulative Layout Shift is high, reserve space for dynamic content')
    }

    return recommendations
  }

  public analyzeCriticalPath() {
    // Analyze which bundles are loaded synchronously
    const criticalBundles = this.stats.filter(stat => 
      stat.type === 'vendor' && stat.priority === 'high'
    )

    const nonCriticalBundles = this.stats.filter(stat => 
      stat.type === 'feature' || stat.priority === 'low'
    )

    logger.info('📊 Critical Path Analysis', {
      critical: criticalBundles.map(b => ({ name: b.name, size: `${(b.size / 1024).toFixed(2)}KB` })),
      nonCritical: nonCriticalBundles.map(b => ({ name: b.name, size: `${(b.size / 1024).toFixed(2)}KB` })),
      savings: `${((nonCriticalBundles.reduce((sum, b) => sum + b.size, 0) / 1024)).toFixed(2)}KB could be lazy loaded`
    })
  }
}

// Global instance
export const bundleAnalyzer = new BundleAnalyzer()

// Export for manual analysis
export function analyzeBundlePerformance() {
  bundleAnalyzer.logPerformanceReport()
  bundleAnalyzer.analyzeCriticalPath()
  
  return {
    stats: bundleAnalyzer.getBundleStats(),
    metrics: bundleAnalyzer.getPerformanceMetrics(),
    summary: bundleAnalyzer.getBundleSummary()
  }
}
