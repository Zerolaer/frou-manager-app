import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { supabase } from '@/lib/supabaseClient'
import { CoreInput } from '@/components/ui/CoreInput'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthErrorBanner from '@/components/auth/AuthErrorBanner'
import { useGuestOnly } from '@/hooks/useGuestOnly'
import { authRedirectUrl, mapAuthError, mapAuthException } from '@/lib/authFlow'

export default function ForgotPassword() {
  const { t } = useSafeTranslation()
  const ready = useGuestOnly()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirectUrl('/reset-password'),
      })

      if (resetError) {
        setError(mapAuthError(resetError, t) ?? t('errors.unknownError'))
        return
      }

      setSuccess(t('auth.forgotPasswordEmailSent'))
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
          {t('auth.forgotPasswordTitle')}
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed mt-1">
          {t('auth.forgotPasswordSubtitle')}
        </p>
      </div>

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
          <label htmlFor="forgot-email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
            {t('login.email')}
          </label>
          <CoreInput
            id="forgot-email"
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

        <button
          type="submit"
          className="w-full bg-black text-white hover:bg-gray-800 active:bg-gray-900 px-4 py-3 sm:py-3.5 md:py-4 rounded-xl font-medium text-sm sm:text-base transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation min-h-[44px] focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? t('common.loading') : t('auth.sendResetLink')}
        </button>
      </form>

      <div className="mt-4 sm:mt-5 md:mt-6 text-center">
        <Link
          to="/login"
          className="text-xs sm:text-sm text-gray-900 font-medium hover:underline transition-colors touch-manipulation min-h-[44px] inline-flex items-center justify-center w-full"
        >
          {t('auth.backToLogin')}
        </Link>
      </div>
    </AuthLayout>
  )
}
