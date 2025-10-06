import React, { useEffect, useState } from 'react'
import { isDevelopment } from '@/lib/env'

interface PerformanceMetrics {
  fcp: number | null // First Contentful Paint
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  ttfb: number | null // Time to First Byte
  bundleSize: number | null
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    bundleSize: null
  })

  useEffect(() => {
    // Only run in development
    if (!isDevelopment()) return

    const measurePerformance = () => {
      const newMetrics: PerformanceMetrics = {
        fcp: null,
        lcp: null,
        fid: null,
        cls: null,
        ttfb: null,
        bundleSize: null
      }

      // Measure Core Web Vitals
      if ('PerformanceObserver' in window) {
        // First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint')
          if (fcpEntry) {
            newMetrics.fcp = fcpEntry.startTime
          }
        })
        fcpObserver.observe({ entryTypes: ['paint'] })

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          if (lastEntry) {
            newMetrics.lcp = lastEntry.startTime
          }
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            if (entry.processingStart && entry.startTime) {
              newMetrics.fid = entry.processingStart - entry.startTime
            }
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })

        // Cumulative Layout Shift
        let clsValue = 0
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          })
          newMetrics.cls = clsValue
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
      }

      // Time to First Byte
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        newMetrics.ttfb = navigation.responseStart - navigation.requestStart
      }

      // Bundle size estimation
      const resources = performance.getEntriesByType('resource')
      const jsResources = resources.filter((resource: any) => 
        resource.name.includes('.js') && !resource.name.includes('node_modules')
      )
      const totalSize = jsResources.reduce((sum: number, resource: any) => 
        sum + (resource.transferSize || 0), 0
      )
      newMetrics.bundleSize = totalSize

      setMetrics(newMetrics)
    }

    // Measure after page load
    if (document.readyState === 'complete') {
      measurePerformance()
    } else {
      window.addEventListener('load', measurePerformance)
    }

    return () => {
      window.removeEventListener('load', measurePerformance)
    }
  }, [])

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs font-mono max-w-xs">
      <div className="font-bold mb-2">Performance Metrics</div>
      <div className="space-y-1">
        <div>FCP: {metrics.fcp ? `${metrics.fcp.toFixed(0)}ms` : 'measuring...'}</div>
        <div>LCP: {metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : 'measuring...'}</div>
        <div>FID: {metrics.fid ? `${metrics.fid.toFixed(0)}ms` : 'measuring...'}</div>
        <div>CLS: {metrics.cls ? metrics.cls.toFixed(3) : 'measuring...'}</div>
        <div>TTFB: {metrics.ttfb ? `${metrics.ttfb.toFixed(0)}ms` : 'measuring...'}</div>
        <div>Bundle: {metrics.bundleSize ? `${(metrics.bundleSize / 1024).toFixed(1)}KB` : 'measuring...'}</div>
      </div>
    </div>
  )
}

export default PerformanceMonitor

