/**
 * Hook to detect if user prefers reduced motion
 * Respects system settings for accessibility
 */

import { useEffect, useState } from 'react'

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return prefersReducedMotion
}

/**
 * Get animation duration respecting user preferences
 */
export function getAnimationDuration(
  normalDuration: number, 
  reducedMotion: boolean
): number {
  return reducedMotion ? 0 : normalDuration
}

/**
 * Get animation delay respecting user preferences
 */
export function getAnimationDelay(
  normalDelay: number, 
  reducedMotion: boolean
): number {
  return reducedMotion ? 0 : normalDelay
}


