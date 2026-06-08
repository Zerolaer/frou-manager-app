import { Capacitor } from '@capacitor/core'

export const NATIVE_APP_SCHEME = 'frovo'

/** True when running inside a Capacitor native shell (iOS or Android). */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

export function isNativeIOS(): boolean {
  return Capacitor.getPlatform() === 'ios'
}

export function isNativeAndroid(): boolean {
  return Capacitor.getPlatform() === 'android'
}

/** Mobile UI: native iOS app or narrow viewport (same breakpoint as Tailwind md). */
export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
}

export function isMobileUI(): boolean {
  return isNativeIOS() || isMobileViewport()
}

/** OAuth / email link redirect base for Supabase auth. */
export function nativeAuthRedirectUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (isNativeApp()) {
    const route = normalized.replace(/^\//, '') || 'login'
    return `${NATIVE_APP_SCHEME}://${route}`
  }
  return `${window.location.origin}${normalized}`
}
