import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { supabase } from '@/lib/supabaseClient'
import { CoreInput } from '@/components/ui/CoreInput'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthErrorBanner from '@/components/auth/AuthErrorBanner'
import { isRecoveryHash, mapAuthError, mapAuthException } from '@/lib/authFlow'

const MIN_PASSWORD_LENGTH = 6

export default function ResetPassword() {
  const { t } = useSafeTranslation()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [canReset, setCanReset] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let recovery = isRecoveryHash()
    if (recovery) setCanReset(true)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY') {
        recovery = true
        setCanReset(true)
        setReady(true)
      }
    })

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      if (data.session && (recovery || isRecoveryHash())) {
        setCanReset(true)
      }
      setReady(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

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
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(mapAuthError(updateError, t) ?? t('errors.unknownError'))
        return
      }
      setSuccess(t('auth.resetPasswordSuccess'))
      window.setTimeout(() => navigate('/login', { replace: true }), 1500)
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
          {t('auth.resetPasswordTitle')}
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed mt-1">
          {t('auth.resetPasswordSubtitle')}
        </p>
      </div>

      {!canReset ? (
        <>
          <AuthErrorBanner message={t('auth.resetLinkInvalid')} />
          <div className="mt-4 text-center space-y-2">
            <Link
              to="/forgot-password"
              className="block text-xs sm:text-sm text-gray-900 font-medium hover:underline"
            >
              {t('auth.requestNewResetLink')}
            </Link>
            <Link
              to="/login"
              className="block text-xs sm:text-sm text-gray-600 hover:text-gray-900"
            >
              {t('auth.backToLogin')}
            </Link>
          </div>
        </>
      ) : (
        <>
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
              <label htmlFor="new-password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                {t('auth.newPassword')}
              </label>
              <CoreInput
                id="new-password"
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
              <label htmlFor="confirm-new-password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                {t('auth.confirmPassword')}
              </label>
              <CoreInput
                id="confirm-new-password"
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
              disabled={loading || !!success}
              aria-busy={loading}
            >
              {loading ? t('common.loading') : t('auth.updatePassword')}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
