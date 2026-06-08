import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { isNativeIOS, NATIVE_APP_SCHEME, nativeAuthRedirectUrl } from '@/platform/nativeApp'

export type TranslateFn = (key: string, options?: Record<string, unknown>) => string

export const NATIVE_AUTH_LOGIN_REDIRECT = `${NATIVE_APP_SCHEME}://login`
export const NATIVE_AUTH_RESET_REDIRECT = `${NATIVE_APP_SCHEME}://reset-password`

/** Absolute redirect URL for Supabase auth (OAuth, email links). */
export function authRedirectUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (isNativeIOS()) {
    if (normalized === '/login') return NATIVE_AUTH_LOGIN_REDIRECT
    if (normalized === '/reset-password') return NATIVE_AUTH_RESET_REDIRECT
  }
  return nativeAuthRedirectUrl(path)
}

export async function signInWithGoogle(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: authRedirectUrl('/login'),
    },
  })
  return { error }
}

export async function signInWithApple(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: authRedirectUrl('/login'),
    },
  })
  return { error }
}

function parseNativeAuthUrl(url: string): URL | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== `${NATIVE_APP_SCHEME}:`) return null
    return parsed
  } catch {
    return null
  }
}

function authParamsFromUrl(parsed: URL): URLSearchParams {
  const hash = parsed.hash.replace(/^#/, '')
  const params = new URLSearchParams(parsed.search)
  if (hash) {
    const hashParams = new URLSearchParams(hash)
    hashParams.forEach((value, key) => {
      if (!params.has(key)) params.set(key, value)
    })
  }
  return params
}

function routeFromNativeAuthUrl(parsed: URL): '/login' | '/reset-password' {
  const segment = parsed.host || parsed.pathname.replace(/^\//, '') || 'login'
  return segment === 'reset-password' ? '/reset-password' : '/login'
}

/**
 * Handle frovo:// OAuth / recovery callbacks on native iOS.
 * Returns the in-app path to navigate to after applying tokens.
 */
export async function completeAuthFromDeepLink(url: string): Promise<{
  navigateTo: string
  error: AuthError | null
}> {
  const parsed = parseNativeAuthUrl(url)
  if (!parsed) {
    return { navigateTo: '/login', error: null }
  }

  const route = routeFromNativeAuthUrl(parsed)
  const params = authParamsFromUrl(parsed)
  const code = params.get('code')
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return { navigateTo: route, error }
    if (route === '/reset-password') return { navigateTo: '/reset-password', error: null }
    return { navigateTo: '/', error: null }
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) return { navigateTo: route, error }
    if (route === '/reset-password' || params.get('type') === 'recovery') {
      return { navigateTo: '/reset-password', error: null }
    }
    return { navigateTo: '/', error: null }
  }

  return { navigateTo: route, error: null }
}

export function isRecoveryHash(): boolean {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return false
  const params = new URLSearchParams(hash)
  return params.get('type') === 'recovery'
}

/** Map Supabase auth errors to i18n-friendly messages. */
export function mapAuthError(error: AuthError | null, t: TranslateFn): string | null {
  if (!error) return null
  const msg = error.message ?? ''

  if (msg.includes('Invalid login credentials')) {
    return t('login.invalidCredentials')
  }
  if (msg.includes('Email not confirmed')) {
    return t('login.emailNotConfirmed')
  }
  if (msg.includes('User already registered')) {
    return t('auth.signUpAlreadyRegistered')
  }
  if (msg.includes('Password should be at least')) {
    return t('auth.passwordTooShort')
  }
  if (msg.includes('Unable to validate email address')) {
    return t('errors.invalidEmail')
  }
  if (
    msg.includes('upgrade required') ||
    msg.includes('Upgrade Required') ||
    error.status === 426
  ) {
    return t('login.projectUpgradeRequired')
  }
  if (
    msg.includes('fetch') ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError')
  ) {
    return t('errors.networkError')
  }

  return msg || t('errors.unknownError')
}

export function mapAuthException(err: unknown, t: TranslateFn): string {
  const anyErr = err as { message?: string; name?: string }
  if (
    anyErr?.message?.includes('fetch') ||
    anyErr?.message?.includes('Failed to fetch') ||
    anyErr?.name === 'TypeError'
  ) {
    return t('errors.networkError')
  }
  return anyErr?.message || t('errors.networkError')
}
