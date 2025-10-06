// Performance utilities
import { isDevelopment } from '@/lib/env'

// Debounce function for search and other frequent operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle function for scroll and resize events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Intersection Observer for lazy loading
export function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
) {
  const observerRef = React.useRef<IntersectionObserver | null>(null)
  const elementRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    observerRef.current = new IntersectionObserver(callback, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    })

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [callback, options])

  const observe = React.useCallback((element: HTMLElement | null) => {
    if (elementRef.current) {
      observerRef.current?.unobserve(elementRef.current)
    }
    
    elementRef.current = element
    
    if (element && observerRef.current) {
      observerRef.current.observe(element)
    }
  }, [])

  return observe
}

// Memory usage monitoring
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = React.useState<{
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  } | null>(null)

  React.useEffect(() => {
    if (typeof window === 'undefined' || !('memory' in performance)) return

    const updateMemoryInfo = () => {
      const memory = (performance as any).memory
      if (memory) {
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        })
      }
    }

    updateMemoryInfo()
    const interval = setInterval(updateMemoryInfo, 5000)

    return () => clearInterval(interval)
  }, [])

  return memoryInfo
}

// Bundle size analyzer
export function analyzeBundleSize() {
  if (!isDevelopment()) return

  const resources = performance.getEntriesByType('resource')
  const jsFiles = resources.filter((resource: any) => 
    resource.name.includes('.js') && 
    !resource.name.includes('node_modules')
  )

  const totalSize = jsFiles.reduce((sum: number, resource: any) => 
    sum + (resource.transferSize || 0), 0
  )

  console.group('📦 Bundle Analysis')
  console.log(`Total JS size: ${(totalSize / 1024).toFixed(2)} KB`)
  
  jsFiles.forEach((resource: any) => {
    const size = (resource.transferSize || 0) / 1024
    const name = resource.name.split('/').pop()
    console.log(`${name}: ${size.toFixed(2)} KB`)
  })
  
  console.groupEnd()

  return {
    totalSize,
    files: jsFiles.map((resource: any) => ({
      name: resource.name.split('/').pop(),
      size: resource.transferSize || 0
    }))
  }
}

// Preload critical resources
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return

  // Preload critical routes
  const criticalRoutes = ['/finance', '/tasks', '/goals', '/notes']
  
  criticalRoutes.forEach(route => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = route
    document.head.appendChild(link)
  })

  // Preload critical images
  const criticalImages = [
    // Add critical image paths here
  ]
  
  criticalImages.forEach(src => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = src
    link.as = 'image'
    document.head.appendChild(link)
  })
}

// Service Worker registration for caching
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

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

// Import React for hooks
import React from 'react'

