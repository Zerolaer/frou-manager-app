// Animation utilities and configurations

export interface AnimationConfig {
  duration?: number
  delay?: number
  easing?: string
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both'
  iterationCount?: number | 'infinite'
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'
}

export interface TransitionConfig {
  property: string | string[]
  duration: number
  easing?: string
  delay?: number
}

// Common easing functions
export const EASING = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  // Custom cubic-bezier curves
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  gentle: 'cubic-bezier(0.25, 0.8, 0.25, 1)'
} as const

// Animation durations
export const DURATION = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 750,
  slowest: 1000
} as const

// Common animation configurations
export const ANIMATIONS = {
  fadeIn: {
    duration: DURATION.normal,
    easing: EASING.easeOut,
    fillMode: 'both' as const
  },
  fadeOut: {
    duration: DURATION.normal,
    easing: EASING.easeIn,
    fillMode: 'both' as const
  },
  slideInUp: {
    duration: DURATION.normal,
    easing: EASING.bounce,
    fillMode: 'both' as const
  },
  slideInDown: {
    duration: DURATION.normal,
    easing: EASING.bounce,
    fillMode: 'both' as const
  },
  slideInLeft: {
    duration: DURATION.normal,
    easing: EASING.smooth,
    fillMode: 'both' as const
  },
  slideInRight: {
    duration: DURATION.normal,
    easing: EASING.smooth,
    fillMode: 'both' as const
  },
  scaleIn: {
    duration: DURATION.fast,
    easing: EASING.elastic,
    fillMode: 'both' as const
  },
  scaleOut: {
    duration: DURATION.fast,
    easing: EASING.sharp,
    fillMode: 'both' as const
  },
  rotateIn: {
    duration: DURATION.normal,
    easing: EASING.smooth,
    fillMode: 'both' as const
  },
  bounce: {
    duration: DURATION.slow,
    easing: EASING.bounce,
    fillMode: 'both' as const
  },
  pulse: {
    duration: DURATION.normal,
    easing: EASING.easeInOut,
    fillMode: 'both' as const,
    iterationCount: 'infinite' as const,
    direction: 'alternate' as const
  },
  shake: {
    duration: DURATION.fast,
    easing: EASING.sharp,
    fillMode: 'both' as const
  }
} as const

// Transition configurations
export const TRANSITIONS = {
  all: {
    property: 'all',
    duration: DURATION.normal,
    easing: EASING.smooth
  },
  colors: {
    property: ['color', 'background-color', 'border-color', 'fill', 'stroke'],
    duration: DURATION.fast,
    easing: EASING.easeOut
  },
  transform: {
    property: 'transform',
    duration: DURATION.normal,
    easing: EASING.smooth
  },
  opacity: {
    property: 'opacity',
    duration: DURATION.normal,
    easing: EASING.easeOut
  },
  height: {
    property: 'height',
    duration: DURATION.normal,
    easing: EASING.smooth
  },
  width: {
    property: 'width',
    duration: DURATION.normal,
    easing: EASING.smooth
  },
  scale: {
    property: 'transform',
    duration: DURATION.fast,
    easing: EASING.elastic
  }
} as const

// CSS keyframes
export const KEYFRAMES = {
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' }
  },
  fadeOut: {
    '0%': { opacity: '1' },
    '100%': { opacity: '0' }
  },
  slideInUp: {
    '0%': { transform: 'translateY(100%)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' }
  },
  slideInDown: {
    '0%': { transform: 'translateY(-100%)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' }
  },
  slideInLeft: {
    '0%': { transform: 'translateX(-100%)', opacity: '0' },
    '100%': { transform: 'translateX(0)', opacity: '1' }
  },
  slideInRight: {
    '0%': { transform: 'translateX(100%)', opacity: '0' },
    '100%': { transform: 'translateX(0)', opacity: '1' }
  },
  scaleIn: {
    '0%': { transform: 'scale(0)', opacity: '0' },
    '100%': { transform: 'scale(1)', opacity: '1' }
  },
  scaleOut: {
    '0%': { transform: 'scale(1)', opacity: '1' },
    '100%': { transform: 'scale(0)', opacity: '0' }
  },
  rotateIn: {
    '0%': { transform: 'rotate(-180deg)', opacity: '0' },
    '100%': { transform: 'rotate(0deg)', opacity: '1' }
  },
  bounce: {
    '0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0, 0, 0)' },
    '40%, 43%': { transform: 'translate3d(0, -30px, 0)' },
    '70%': { transform: 'translate3d(0, -15px, 0)' },
    '90%': { transform: 'translate3d(0, -4px, 0)' }
  },
  pulse: {
    '0%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.05)' },
    '100%': { transform: 'scale(1)' }
  },
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-10px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(10px)' }
  },
  shimmer: {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(100%)' }
  },
  spin: {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' }
  },
  ping: {
    '0%': { transform: 'scale(1)', opacity: '1' },
    '75%, 100%': { transform: 'scale(2)', opacity: '0' }
  },
  wiggle: {
    '0%, 100%': { transform: 'rotate(-3deg)' },
    '50%': { transform: 'rotate(3deg)' }
  }
} as const

// Utility functions
export function createAnimation(
  element: HTMLElement,
  keyframes: Record<string, any>,
  config: AnimationConfig = {}
): Animation | null {
  if (!element || !('animate' in element)) return null

  const animationConfig = {
    duration: DURATION.normal,
    easing: EASING.easeOut,
    fillMode: 'both',
    ...config
  }

  return element.animate(keyframes, {
    duration: animationConfig.duration,
    delay: animationConfig.delay || 0,
    easing: animationConfig.easing,
    fill: animationConfig.fillMode,
    iterations: animationConfig.iterationCount || 1,
    direction: animationConfig.direction || 'normal'
  })
}

export function createTransition(
  element: HTMLElement,
  config: TransitionConfig
): void {
  if (!element) return

  const properties = Array.isArray(config.property) 
    ? config.property.join(', ') 
    : config.property

  element.style.transition = `${properties} ${config.duration}ms ${config.easing || EASING.smooth}`
  
  if (config.delay) {
    element.style.transitionDelay = `${config.delay}ms`
  }
}

export function animateIn(
  element: HTMLElement,
  animation: keyof typeof ANIMATIONS = 'fadeIn',
  delay: number = 0
): Animation | null {
  if (!element) return null

  const config = { ...ANIMATIONS[animation], delay }
  const keyframes = KEYFRAMES[animation] || KEYFRAMES.fadeIn

  return createAnimation(element, keyframes, config)
}

export function animateOut(
  element: HTMLElement,
  animation: keyof typeof ANIMATIONS = 'fadeOut',
  delay: number = 0
): Animation | null {
  if (!element) return null

  const config = { ...ANIMATIONS[animation], delay }
  const keyframes = KEYFRAMES[animation] || KEYFRAMES.fadeOut

  return createAnimation(element, keyframes, config)
}

export function staggerAnimation(
  elements: HTMLElement[],
  animation: keyof typeof ANIMATIONS = 'fadeIn',
  staggerDelay: number = 100
): Animation[] {
  return elements
    .map((element, index) => {
      if (!element) return null
      return animateIn(element, animation, index * staggerDelay)
    })
    .filter(Boolean) as Animation[]
}

export function createShimmerEffect(element: HTMLElement): Animation | null {
  if (!element) return null

  return createAnimation(element, KEYFRAMES.shimmer, {
    duration: 2000,
    iterationCount: 'infinite',
    easing: EASING.easeInOut
  })
}

export function createPulseEffect(element: HTMLElement): Animation | null {
  if (!element) return null

  return createAnimation(element, KEYFRAMES.pulse, {
    duration: 2000,
    iterationCount: 'infinite',
    easing: EASING.easeInOut
  })
}

export function createBounceEffect(element: HTMLElement): Animation | null {
  if (!element) return null

  return createAnimation(element, KEYFRAMES.bounce, ANIMATIONS.bounce)
}

export function createShakeEffect(element: HTMLElement): Animation | null {
  if (!element) return null

  return createAnimation(element, KEYFRAMES.shake, ANIMATIONS.shake)
}

// CSS class-based animations
export function addAnimationClass(
  element: HTMLElement,
  animation: string,
  duration?: number
): void {
  if (!element) return

  element.classList.add(`animate-${animation}`)
  
  if (duration) {
    element.style.animationDuration = `${duration}ms`
  }

  // Remove class after animation completes
  element.addEventListener('animationend', () => {
    element.classList.remove(`animate-${animation}`)
  }, { once: true })
}

export function removeAnimationClass(
  element: HTMLElement,
  animation: string
): void {
  if (!element) return

  element.classList.remove(`animate-${animation}`)
}

// Intersection Observer for scroll-triggered animations
export function createScrollAnimations(
  elements: HTMLElement[],
  animation: keyof typeof ANIMATIONS = 'fadeIn',
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateIn(entry.target as HTMLElement, animation)
        observer.unobserve(entry.target)
      }
    })
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
    ...options
  })

  elements.forEach(element => {
    if (element) {
      observer.observe(element)
    }
  })

  return observer
}

// Page transition utilities
export function createPageTransition(
  fromPage: HTMLElement,
  toPage: HTMLElement,
  direction: 'left' | 'right' | 'up' | 'down' = 'right'
): Promise<void> {
  return new Promise((resolve) => {
    if (!fromPage || !toPage) {
      resolve()
      return
    }

    const duration = DURATION.normal
    const easing = EASING.smooth

    // Set up initial states
    toPage.style.opacity = '0'
    toPage.style.transform = getTransformForDirection(direction, true)
    toPage.style.position = 'absolute'
    toPage.style.top = '0'
    toPage.style.left = '0'
    toPage.style.right = '0'
    toPage.style.bottom = '0'

    // Animate out current page
    fromPage.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`
    fromPage.style.opacity = '0'
    fromPage.style.transform = getTransformForDirection(direction, false)

    // Animate in new page
    setTimeout(() => {
      toPage.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`
      toPage.style.opacity = '1'
      toPage.style.transform = 'translate(0, 0)'

      // Clean up after animation
      setTimeout(() => {
        fromPage.style.display = 'none'
        toPage.style.position = 'relative'
        toPage.style.top = 'auto'
        toPage.style.left = 'auto'
        toPage.style.right = 'auto'
        toPage.style.bottom = 'auto'
        resolve()
      }, duration)
    }, duration / 2)
  })
}

function getTransformForDirection(direction: string, isEntering: boolean): string {
  const offset = isEntering ? '100%' : '-100%'
  
  switch (direction) {
    case 'left':
      return `translateX(${isEntering ? offset : '-' + offset})`
    case 'right':
      return `translateX(${isEntering ? '-' + offset : offset})`
    case 'up':
      return `translateY(${isEntering ? offset : '-' + offset})`
    case 'down':
      return `translateY(${isEntering ? '-' + offset : offset})`
    default:
      return `translateX(${isEntering ? offset : '-' + offset})`
  }
}

// Export CSS for animations
export const ANIMATION_CSS = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes slideInUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideInDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideInLeft {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes scaleOut {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(0); opacity: 0; }
}

@keyframes rotateIn {
  from { transform: rotate(-180deg); opacity: 0; }
  to { transform: rotate(0deg); opacity: 1; }
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% { transform: translate3d(0, 0, 0); }
  40%, 43% { transform: translate3d(0, -30px, 0); }
  70% { transform: translate3d(0, -15px, 0); }
  90% { transform: translate3d(0, -4px, 0); }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
  20%, 40%, 60%, 80% { transform: translateX(10px); }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes ping {
  0% { transform: scale(1); opacity: 1; }
  75%, 100% { transform: scale(2); opacity: 0; }
}

@keyframes wiggle {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

.animate-fadeIn { animation: fadeIn 0.3s ease-out both; }
.animate-fadeOut { animation: fadeOut 0.3s ease-in both; }
.animate-slideInUp { animation: slideInUp 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) both; }
.animate-slideInDown { animation: slideInDown 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) both; }
.animate-slideInLeft { animation: slideInLeft 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
.animate-slideInRight { animation: slideInRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
.animate-scaleIn { animation: scaleIn 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
.animate-scaleOut { animation: scaleOut 0.15s cubic-bezier(0.4, 0, 0.6, 1) both; }
.animate-rotateIn { animation: rotateIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
.animate-bounce { animation: bounce 0.75s cubic-bezier(0.68, -0.55, 0.265, 1.55) both; }
.animate-pulse { animation: pulse 0.3s ease-in-out infinite alternate; }
.animate-shake { animation: shake 0.15s cubic-bezier(0.4, 0, 0.6, 1) both; }
.animate-spin { animation: spin 1s linear infinite; }
.animate-ping { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }
.animate-wiggle { animation: wiggle 1s ease-in-out infinite; }
`

