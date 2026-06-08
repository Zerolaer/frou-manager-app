import { useEffect } from 'react'
import { hideNativeSplash } from '@/platform/capacitorInit'

/** Hides the Capacitor splash screen after the first client render. */
export default function NativeSplashGate() {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void hideNativeSplash()
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  return null
}
