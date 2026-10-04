import { useState, useEffect } from 'react'
import { isMobileUI, isNativeIOS } from '@/platform/nativeApp'

export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(() => isMobileUI())
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      if (isNativeIOS() && window.innerWidth < 768) {
        setIsMobile(true)
        setIsTablet(false)
        return
      }

      const width = window.innerWidth
      setIsMobile(width < 768) // md breakpoint
      setIsTablet(width >= 768 && width < 1024) // md to lg breakpoint
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)

    return () => {
      window.removeEventListener('resize', checkDevice)
    }
  }, [])

  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet }
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
    if (typeof window === 'undefined') return 'desktop'
    if (window.innerWidth < 768) return 'mobile'
    if (window.innerWidth < 1024) return 'tablet'
    return 'desktop'
  })

  useEffect(() => {
    const checkBreakpoint = () => {
      if (isNativeIOS() && window.innerWidth < 768) {
        setBreakpoint('mobile')
        return
      }

      const width = window.innerWidth
      if (width < 768) {
        setBreakpoint('mobile')
      } else if (width < 1024) {
        setBreakpoint('tablet')
      } else {
        setBreakpoint('desktop')
      }
    }

    checkBreakpoint()
    window.addEventListener('resize', checkBreakpoint)

    return () => {
      window.removeEventListener('resize', checkBreakpoint)
    }
  }, [])

  return breakpoint
}
