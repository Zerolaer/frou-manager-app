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
import { authRedirectUrl, mapAuthError, mapAuthException } from '@/lib/authFlow'

const MIN_PASSWORD_LENGTH = 6

export default function Signup() {
  const { t } = useSafeTranslation()
  const navigate = useNavigate()
  const ready = useGuestOnly()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth.passwordTooShort'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'))
      return
    }

    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: authRedirectUrl('/login'),
        },
      })

      if (signUpError) {
        setError(mapAuthError(signUpError, t) ?? t('errors.unknownError'))
        return
      }

      if (data.session) {
        navigate('/', { replace: true })
        return
      }

      setSuccess(t('auth.signUpConfirmEmail'))
    } catch (err) {
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
          {t('auth.signUpTitle')}
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed mt-1">
          {t('auth.signUpSubtitle')}
        </p>
      </div>

      <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6">
        <GoogleSignInButton onError={setError} disabled={loading} />
        <AppleSignInButton onError={setError} disabled={loading} />
      </div>

      <AuthDivider />

      {error && <AuthErrorBanner message={error} />}
      {success && (
        <div
          role="status"
          className="mb-3 sm:mb-4 text-xs sm:text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 break-words"
        >
          {success}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4 md:space-y-5">
        <div>
          <label htmlFor="signup-email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
            {t('login.email')}
          </label>
          <CoreInput
            id="signup-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('login.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full min-h-[44px] text-base sm:text-base"
          />
        </div>

        <div>
          <label htmlFor="signup-password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
            {t('login.password')}
          </label>
          <CoreInput
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder={t('login.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            className="w-full min-h-[44px] text-base sm:text-base"
          />
        </div>

        <div>
          <label htmlFor="signup-confirm" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
            {t('auth.confirmPassword')}
          </label>
          <CoreInput
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            className="w-full min-h-[44px] text-base sm:text-base"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white hover:bg-gray-800 active:bg-gray-900 px-4 py-3 sm:py-3.5 md:py-4 rounded-xl font-medium text-sm sm:text-base transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation min-h-[44px] focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? t('common.loading') : t('auth.createAccount')}
        </button>
      </form>

      <div className="mt-4 sm:mt-5 md:mt-6 text-center">
        <span className="text-xs sm:text-sm text-gray-600">{t('login.haveAccount')} </span>
        <Link
          to="/login"
          className="text-xs sm:text-sm text-gray-900 font-medium hover:underline transition-colors touch-manipulation min-h-[44px] inline-flex items-center"
        >
          {t('login.signIn')}
        </Link>
      </div>
    </AuthLayout>
  )
}
