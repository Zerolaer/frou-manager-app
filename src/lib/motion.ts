/**
 * Motion and animation utilities with prefers-reduced-motion support
 */

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get animation duration based on user preference
 * Returns 0 if user prefers reduced motion
 */
export function getAnimationDuration(duration: number): number {
  return prefersReducedMotion() ? 0 : duration
}

/**
 * Get transition class based on user preference
 */
export function getTransitionClass(transitionClass: string): string {
  return prefersReducedMotion() ? '' : transitionClass
}

/**
 * Hook into prefers-reduced-motion changes
 */
export function watchReducedMotion(callback: (prefersReduced: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  
  const handler = (e: MediaQueryListEvent | MediaQueryList) => {
    callback(e.matches)
  }
  
  // Initial call
  handler(mediaQuery)
  
  // Listen for changes
  mediaQuery.addEventListener('change', handler)
  
  // Cleanup
  return () => {
    mediaQuery.removeEventListener('change', handler)
  }
}

/**
 * Create motion-safe CSS class
 * Only applies animation if user doesn't prefer reduced motion
 */
export function motionSafe(animationClass: string, fallbackClass = ''): string {
  return prefersReducedMotion() ? fallbackClass : animationClass
}

/**
 * Spring animation config with reduced motion support
 */
export const springConfig = {
  default: {
    stiffness: prefersReducedMotion() ? 500 : 100,
    damping: prefersReducedMotion() ? 50 : 10,
    mass: 1
  },
  gentle: {
    stiffness: prefersReducedMotion() ? 500 : 120,
    damping: prefersReducedMotion() ? 50 : 14,
    mass: 1
  },
  wobbly: {
    stiffness: prefersReducedMotion() ? 500 : 180,
    damping: prefersReducedMotion() ? 50 : 12,
    mass: 1
  },
  stiff: {
    stiffness: prefersReducedMotion() ? 500 : 210,
    damping: prefersReducedMotion() ? 50 : 20,
    mass: 1
  }
}

/**
 * Transition duration presets (in ms)
 */
export const transitionDuration = {
  fast: getAnimationDuration(150),
  normal: getAnimationDuration(300),
  slow: getAnimationDuration(500),
  slower: getAnimationDuration(700)
}

/**
 * Easing functions
 */
export const easing = {
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  linear: 'linear'
}

