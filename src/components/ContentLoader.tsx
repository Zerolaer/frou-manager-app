/**
 * Modern Content Loading System
 * 
 * Features:
 * - View Transitions API for smooth page transitions
 * - Staggered animations for gradual appearance
 * - Content-visibility for performance
 * - Skeleton screens matching real content
 * - Layout shift prevention
 */

import React, { useEffect, useState, useRef } from 'react'
import { useReducedMotion, getAnimationDuration, getAnimationDelay } from '@/hooks/useReducedMotion'

// ==================== Utilities ====================

/**
 * Check if View Transitions API is supported
 */
export const supportsViewTransitions = () => {
  return typeof document !== 'undefined' && 'startViewTransition' in document
}

/**
 * Wrap state update in View Transition if supported
 */
export function withViewTransition(callback: () => void) {
  if (supportsViewTransitions() && (document as any).startViewTransition) {
    (document as any).startViewTransition(callback)
  } else {
    callback()
  }
}

// ==================== Fade In Animation ====================

interface FadeInProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  className?: string
}

export function FadeIn({ children, delay = 0, duration = 300, className = '' }: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const actualDelay = getAnimationDelay(delay, prefersReducedMotion)
  const actualDuration = getAnimationDuration(duration, prefersReducedMotion)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), actualDelay)
    return () => clearTimeout(timer)
  }, [actualDelay])

  return (
    <div
      ref={ref}
      className={`transition-all ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : (prefersReducedMotion ? 'translateY(0)' : 'translateY(10px)'),
        transitionDuration: `${actualDuration}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ==================== Staggered Children ====================

interface StaggeredChildrenProps {
  children: React.ReactNode[]
  delay?: number
  stagger?: number
  className?: string
}

export function StaggeredChildren({ 
  children, 
  delay = 0, 
  stagger = 50, 
  className = '' 
}: StaggeredChildrenProps) {
  const prefersReducedMotion = useReducedMotion()
  const actualStagger = getAnimationDelay(stagger, prefersReducedMotion)

  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <FadeIn delay={delay + index * actualStagger} key={index}>
          {child}
        </FadeIn>
      ))}
    </div>
  )
}

// ==================== Content Loader Wrapper ====================

interface ContentLoaderProps {
  loading: boolean
  error?: Error | null
  empty?: boolean
  emptyMessage?: string
  skeleton?: React.ReactNode
  children: React.ReactNode
  fadeIn?: boolean
  stagger?: boolean
  minHeight?: string
}

export function ContentLoader({
  loading,
  error,
  empty = false,
  emptyMessage = 'Нет данных',
  skeleton,
  children,
  fadeIn = true,
  stagger = false,
  minHeight
}: ContentLoaderProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Prevent layout shift with minimum height
  const wrapperStyle: React.CSSProperties = {
    minHeight: minHeight || (loading ? '400px' : 'auto'),
  }

  if (loading) {
    return (
      <div style={wrapperStyle} className="content-loader-container">
        {skeleton || <DefaultSkeleton />}
      </div>
    )
  }

  if (error) {
    return (
      <div style={wrapperStyle} className="content-loader-container">
        <FadeIn>
          <ErrorDisplay error={error} />
        </FadeIn>
      </div>
    )
  }

  if (empty) {
    return (
      <div style={wrapperStyle} className="content-loader-container">
        <FadeIn>
          <EmptyDisplay message={emptyMessage} />
        </FadeIn>
      </div>
    )
  }

  // Content loaded - show with animation
  if (fadeIn && !stagger) {
    return (
      <div style={wrapperStyle} className="content-loader-container">
        <FadeIn duration={400}>{children}</FadeIn>
      </div>
    )
  }

  if (stagger && Array.isArray(children)) {
    return (
      <div style={wrapperStyle} className="content-loader-container">
        <StaggeredChildren>{children}</StaggeredChildren>
      </div>
    )
  }

  return <div style={wrapperStyle} className="content-loader-container">{children}</div>
}

// ==================== Error Display ====================

function ErrorDisplay({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-50 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Ошибка загрузки</h3>
      <p className="text-sm text-gray-600 max-w-md">{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Обновить страницу
      </button>
    </div>
  )
}

// ==================== Empty Display ====================

function EmptyDisplay({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-gray-50 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <p className="text-gray-600">{message}</p>
    </div>
  )
}

// ==================== Default Skeleton ====================

function DefaultSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-24 bg-gray-200 rounded-lg"></div>
        </div>
      ))}
    </div>
  )
}

// ==================== Optimized Container ====================

/**
 * Container with content-visibility for performance
 * Only renders content when in viewport
 */
interface OptimizedContainerProps {
  children: React.ReactNode
  className?: string
}

export function OptimizedContainer({ children, className = '' }: OptimizedContainerProps) {
  return (
    <div 
      className={className}
      style={{ 
        contentVisibility: 'auto' as any,
        containIntrinsicSize: '0 500px' 
      }}
    >
      {children}
    </div>
  )
}

