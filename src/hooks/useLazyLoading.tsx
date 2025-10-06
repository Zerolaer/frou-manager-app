import { useState, useEffect, useRef, useCallback } from 'react'

interface LazyLoadingOptions {
  threshold?: number
  rootMargin?: string
  enabled?: boolean
}

export function useLazyLoading<T extends HTMLElement>(
  options: LazyLoadingOptions = {}
) {
  const { threshold = 0.1, rootMargin = '50px', enabled = true } = options
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const elementRef = useRef<T>(null)

  useEffect(() => {
    if (!enabled || !elementRef.current || hasLoaded) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          setHasLoaded(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(elementRef.current)

    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin, enabled, hasLoaded])

  return { elementRef, isIntersecting, hasLoaded }
}

// Hook for lazy loading images
export function useLazyImage(
  src: string,
  placeholder?: string,
  options: LazyLoadingOptions = {}
) {
  const { elementRef, isIntersecting } = useLazyLoading<HTMLImageElement>(options)
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (isIntersecting && src) {
      setImageSrc(src)
    }
  }, [isIntersecting, src])

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    setHasError(false)
  }, [])

  const handleError = useCallback(() => {
    setHasError(true)
    setIsLoaded(false)
  }, [])

  return {
    elementRef,
    src: imageSrc,
    isLoaded,
    hasError,
    onLoad: handleLoad,
    onError: handleError
  }
}

// Hook for lazy loading components
export function useLazyComponent(
  importFunction: () => Promise<any>,
  options: LazyLoadingOptions = {}
) {
  const [Component, setComponent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const { elementRef, isIntersecting } = useLazyLoading<HTMLDivElement>(options)

  useEffect(() => {
    if (isIntersecting && !Component && !isLoading) {
      setIsLoading(true)
      setHasError(false)
      
      importFunction()
        .then((module) => {
          setComponent(() => module.default || module)
          setIsLoading(false)
        })
        .catch((error) => {
          console.error('Failed to load component:', error)
          setHasError(true)
          setIsLoading(false)
        })
    }
  }, [isIntersecting, Component, isLoading, importFunction])

  return {
    elementRef,
    Component,
    isLoading,
    hasError
  }
}

// Hook for preloading resources
export function usePreload() {
  const [preloadedResources, setPreloadedResources] = useState<Set<string>>(new Set())

  const preloadImage = useCallback((src: string) => {
    if (preloadedResources.has(src)) return Promise.resolve()

    return new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        setPreloadedResources(prev => new Set([...prev, src]))
        resolve()
      }
      img.onerror = reject
      img.src = src
    })
  }, [preloadedResources])

  const preloadComponent = useCallback(async (importFunction: () => Promise<any>) => {
    try {
      await importFunction()
      return true
    } catch (error) {
      console.error('Failed to preload component:', error)
      return false
    }
  }, [])

  const isPreloaded = useCallback((src: string) => {
    return preloadedResources.has(src)
  }, [preloadedResources])

  return {
    preloadImage,
    preloadComponent,
    isPreloaded
  }
}

// Optimized image component with lazy loading
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  placeholder?: string
  fallback?: string
  threshold?: number
  rootMargin?: string
}

export function LazyImage({
  src,
  placeholder,
  fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Изображение</text></svg>',
  threshold = 0.1,
  rootMargin = '50px',
  className = '',
  alt = '',
  ...props
}: LazyImageProps) {
  const { elementRef, src: imageSrc, isLoaded, hasError, onLoad, onError } = useLazyImage(
    src,
    placeholder,
    { threshold, rootMargin }
  )

  const finalSrc = hasError ? fallback : imageSrc

  return (
    <img
      ref={elementRef}
      src={finalSrc}
      alt={alt}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-70'} ${className}`}
      onLoad={onLoad}
      onError={onError}
      {...props}
    />
  )
}
