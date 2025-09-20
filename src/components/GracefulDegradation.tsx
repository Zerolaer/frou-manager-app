import React, { useState, useEffect, useCallback } from 'react'
import { AccessibleButton } from './AccessibleComponents'
import { FeatureErrorBoundary } from './ErrorBoundaries'

// Hook for feature detection
export function useFeatureDetection() {
  const [features, setFeatures] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const detectedFeatures = {
      // Web APIs
      serviceWorker: 'serviceWorker' in navigator,
      localStorage: typeof Storage !== 'undefined',
      indexedDB: 'indexedDB' in window,
      webGL: !!document.createElement('canvas').getContext('webgl'),
      webGL2: !!document.createElement('canvas').getContext('webgl2'),
      webAudio: !!(window.AudioContext || (window as any).webkitAudioContext),
      webRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      geolocation: 'geolocation' in navigator,
      notifications: 'Notification' in window,
      pushManager: 'PushManager' in window,
      
      // CSS features
      cssGrid: CSS.supports('display', 'grid'),
      cssFlexbox: CSS.supports('display', 'flex'),
      cssCustomProperties: CSS.supports('color', 'var(--test)'),
      cssBackdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
      
      // JavaScript features
      asyncAwait: (async () => {})().then,
      fetch: 'fetch' in window,
      intersectionObserver: 'IntersectionObserver' in window,
      resizeObserver: 'ResizeObserver' in window,
      mutationObserver: 'MutationObserver' in window,
      
      // Browser capabilities
      touchEvents: 'ontouchstart' in window,
      pointerEvents: 'onpointerdown' in window,
      passiveEvents: (() => {
        let supportsPassive = false
        try {
          const opts = Object.defineProperty({}, 'passive', {
            get: () => {
              supportsPassive = true
              return false
            }
          })
          window.addEventListener('testPassive', () => {}, opts)
          window.removeEventListener('testPassive', () => {}, opts)
        } catch (e) {}
        return supportsPassive
      })()
    }

    setFeatures(detectedFeatures)
  }, [])

  const hasFeature = useCallback((feature: string): boolean => {
    return features[feature] === true
  }, [features])

  const hasAllFeatures = useCallback((requiredFeatures: string[]): boolean => {
    return requiredFeatures.every(feature => hasFeature(feature))
  }, [hasFeature])

  const hasAnyFeature = useCallback((optionalFeatures: string[]): boolean => {
    return optionalFeatures.some(feature => hasFeature(feature))
  }, [hasFeature])

  return {
    features,
    hasFeature,
    hasAllFeatures,
    hasAnyFeature
  }
}

// Feature-dependent component wrapper
interface FeatureGateProps {
  feature: string
  fallback?: React.ReactNode
  children: React.ReactNode
  showFallbackMessage?: boolean
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  fallback,
  children,
  showFallbackMessage = true
}) => {
  const { hasFeature } = useFeatureDetection()

  if (!hasFeature(feature)) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (showFallbackMessage) {
      return (
        <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                Функция недоступна
              </h4>
              <p className="text-xs text-yellow-600">
                Ваш браузер не поддерживает эту функцию
              </p>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  return <>{children}</>
}

// Progressive enhancement component
interface ProgressiveEnhancementProps {
  basic: React.ReactNode
  enhanced?: React.ReactNode
  requiredFeatures?: string[]
  optionalFeatures?: string[]
}

export const ProgressiveEnhancement: React.FC<ProgressiveEnhancementProps> = ({
  basic,
  enhanced,
  requiredFeatures = [],
  optionalFeatures = []
}) => {
  const { hasAllFeatures, hasAnyFeature } = useFeatureDetection()

  // Show enhanced version if all required features are available
  const canShowEnhanced = hasAllFeatures(requiredFeatures)

  // Show basic version if no optional features are available
  const shouldShowBasic = !hasAnyFeature(optionalFeatures) && !canShowEnhanced

  if (canShowEnhanced && enhanced) {
    return <>{enhanced}</>
  }

  if (shouldShowBasic) {
    return <>{basic}</>
  }

  // Default to enhanced if available, otherwise basic
  return <>{enhanced || basic}</>
}

// Graceful fallback for failed features
interface GracefulFallbackProps {
  children: React.ReactNode
  fallback: React.ReactNode
  onError?: (error: Error) => void
}

export const GracefulFallback: React.FC<GracefulFallbackProps> = ({
  children,
  fallback,
  onError
}) => {
  return (
    <FeatureErrorBoundary
      featureName="Feature"
      onError={onError}
      fallback={fallback}
    >
      {children}
    </FeatureErrorBoundary>
  )
}

// Performance-based degradation
export function usePerformanceDegradation() {
  const [performanceLevel, setPerformanceLevel] = useState<'high' | 'medium' | 'low'>('high')

  useEffect(() => {
    const measurePerformance = () => {
      // Measure memory usage if available
      const memory = (performance as any).memory
      const deviceMemory = (navigator as any).deviceMemory
      
      // Measure connection speed if available
      const connection = (navigator as any).connection
      
      let score = 0

      // Memory-based scoring
      if (memory) {
        const memoryGB = memory.jsHeapSizeLimit / (1024 * 1024 * 1024)
        if (memoryGB >= 4) score += 2
        else if (memoryGB >= 2) score += 1
      } else if (deviceMemory) {
        if (deviceMemory >= 4) score += 2
        else if (deviceMemory >= 2) score += 1
      }

      // Connection-based scoring
      if (connection) {
        if (connection.effectiveType === '4g') score += 2
        else if (connection.effectiveType === '3g') score += 1
        else if (connection.effectiveType === 'slow-2g') score -= 1
      }

      // CPU cores
      if (navigator.hardwareConcurrency) {
        if (navigator.hardwareConcurrency >= 8) score += 2
        else if (navigator.hardwareConcurrency >= 4) score += 1
      }

      // Determine performance level
      if (score >= 4) {
        setPerformanceLevel('high')
      } else if (score >= 1) {
        setPerformanceLevel('medium')
      } else {
        setPerformanceLevel('low')
      }
    }

    measurePerformance()

    // Re-measure on connection change
    const connection = (navigator as any).connection
    if (connection) {
      connection.addEventListener('change', measurePerformance)
      return () => connection.removeEventListener('change', measurePerformance)
    }
  }, [])

  return {
    performanceLevel,
    isHighPerformance: performanceLevel === 'high',
    isMediumPerformance: performanceLevel === 'medium',
    isLowPerformance: performanceLevel === 'low'
  }
}

// Adaptive component based on performance
interface AdaptiveComponentProps {
  highPerformance: React.ReactNode
  mediumPerformance?: React.ReactNode
  lowPerformance?: React.ReactNode
}

export const AdaptiveComponent: React.FC<AdaptiveComponentProps> = ({
  highPerformance,
  mediumPerformance,
  lowPerformance
}) => {
  const { performanceLevel } = usePerformanceDegradation()

  switch (performanceLevel) {
    case 'high':
      return <>{highPerformance}</>
    case 'medium':
      return <>{mediumPerformance || highPerformance}</>
    case 'low':
      return <>{lowPerformance || mediumPerformance || highPerformance}</>
    default:
      return <>{highPerformance}</>
  }
}

// Browser compatibility checker
export const BrowserCompatibility: React.FC<{
  children: React.ReactNode
  minVersion?: Record<string, number>
  showWarning?: boolean
}> = ({ children, minVersion = {}, showWarning = true }) => {
  const { features } = useFeatureDetection()
  const [isCompatible, setIsCompatible] = useState(true)
  const [warnings, setWarnings] = useState<string[]>([])

  useEffect(() => {
    const warnings: string[] = []

    // Check for critical missing features
    if (!features.localStorage) {
      warnings.push('Локальное хранилище недоступно')
    }

    if (!features.fetch) {
      warnings.push('Fetch API недоступна')
    }

    if (!features.cssFlexbox) {
      warnings.push('CSS Flexbox не поддерживается')
    }

    // Check browser version (simplified)
    const userAgent = navigator.userAgent
    if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
      warnings.push('Internet Explorer не поддерживается')
    }

    setWarnings(warnings)
    setIsCompatible(warnings.length === 0)
  }, [features])

  if (!isCompatible && showWarning) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-red-500">⚠️</span>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-800 mb-2">
              Проблемы совместимости
            </h4>
            <ul className="text-xs text-red-600 space-y-1">
              {warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
            <p className="text-xs text-red-600 mt-2">
              Некоторые функции могут работать некорректно
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Network-aware component
export function useNetworkAwareness() {
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const [isSlowConnection, setIsSlowConnection] = useState(false)

  useEffect(() => {
    const connection = (navigator as any).connection

    if (connection) {
      const updateConnection = () => {
        setConnectionType(connection.effectiveType || 'unknown')
        setIsSlowConnection(
          connection.effectiveType === 'slow-2g' ||
          connection.effectiveType === '2g' ||
          (connection.saveData === true)
        )
      }

      updateConnection()
      connection.addEventListener('change', updateConnection)

      return () => connection.removeEventListener('change', updateConnection)
    }
  }, [])

  return {
    connectionType,
    isSlowConnection,
    shouldReduceDataUsage: isSlowConnection
  }
}

// Data-saving mode component
interface DataSavingModeProps {
  children: React.ReactNode
  dataSavingChildren?: React.ReactNode
}

export const DataSavingMode: React.FC<DataSavingModeProps> = ({
  children,
  dataSavingChildren
}) => {
  const { shouldReduceDataUsage } = useNetworkAwareness()

  if (shouldReduceDataUsage && dataSavingChildren) {
    return <>{dataSavingChildren}</>
  }

  return <>{children}</>
}
