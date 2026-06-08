import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { supabase } from '@/lib/supabaseClient'
import { CoreInput } from '@/components/ui/CoreInput'
import AuthLayout from '@/components/auth/AuthLayout'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'
import AppleSignInButton from '@/components/auth/AppleSignInButton'
import AuthDivider from '@/components/auth/AuthDivider'
import AuthErrorBanner from '@/components/auth/AuthErrorBanner'
import { useGuestOnly } from '@/hooks/useGuestOnly'
import { mapAuthError, mapAuthException } from '@/lib/authFlow'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const ready = useGuestOnly()
  const { t } = useSafeTranslation()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (import.meta.env.DEV) {
        console.log('[auth] sign-in attempt')
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        if (import.meta.env.DEV) {
          console.error('[auth] sign-in error:', signInError.message)
        }
        setError(mapAuthError(signInError, t) ?? t('errors.unknownError'))
        return
      }

      if (data?.session) {
        navigate('/', { replace: true })
      } else {
        setError(t('login.sessionCreateFailed'))
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[auth] sign-in exception:', (err as Error)?.message)
      }
      setError(mapAuthException(err, t))
    } finally {
      setLoading(false)
    }
  }

  if (!ready) {
    return <div className="min-h-screen bg-white w-full" />
  }

  return (
    <AuthLayout>
      <div className="mb-5 sm:mb-6 md:mb-7 lg:mb-8">
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-900 mb-1.5 sm:mb-2 leading-tight font-semibold">
          Hello, <span className="font-light">Welcome back!</span>
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed mt-1">
          {t('login.subtitle')}
        </p>
      </div>

      <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6">
        <GoogleSignInButton onError={setError} disabled={loading} />
        <AppleSignInButton onError={setError} disabled={loading} />
      </div>

      <AuthDivider />

      {error && <AuthErrorBanner message={error} />}

      <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4 md:space-y-5">
        <div>
          <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
            {t('login.email')}
          </label>
          <CoreInput
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('login.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full min-h-[44px] text-base sm:text-base"
            aria-invalid={error ? 'true' : 'false'}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
            {t('login.password')}
          </label>
          <CoreInput
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder={t('login.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full min-h-[44px] text-base sm:text-base"
            aria-invalid={error ? 'true' : 'false'}
          />
        </div>

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] flex items-center touch-manipulation"
          >
            {t('login.forgotPassword')}
          </Link>
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white hover:bg-gray-800 active:bg-gray-900 px-4 py-3 sm:py-3.5 md:py-4 rounded-xl font-medium text-sm sm:text-base transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation min-h-[44px] focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? t('common.loading') : t('login.signIn')}
        </button>
      </form>

      <div className="mt-4 sm:mt-5 md:mt-6 text-center">
        <span className="text-xs sm:text-sm text-gray-600">{t('login.noAccount')} </span>
        <Link
          to="/signup"
          className="text-xs sm:text-sm text-gray-900 font-medium hover:underline transition-colors touch-manipulation min-h-[44px] inline-flex items-center"
        >
          {t('login.signUp')}
        </Link>
      </div>
    </AuthLayout>
  )
}
