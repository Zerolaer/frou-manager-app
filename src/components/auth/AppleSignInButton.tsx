import React, { useState } from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { signInWithApple, mapAuthError, mapAuthException } from '@/lib/authFlow'

type Props = {
  onError?: (message: string) => void
  disabled?: boolean
}

export default function AppleSignInButton({ onError, disabled }: Props) {
  const { t } = useSafeTranslation()
  const [loading, setLoading] = useState(false)

  async function handleApple() {
    if (disabled || loading) return
    setLoading(true)
    try {
      const { error } = await signInWithApple()
      if (error) {
        onError?.(mapAuthError(error, t) ?? t('errors.unknownError'))
        setLoading(false)
      }
    } catch (err) {
      onError?.(mapAuthException(err, t))
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleApple()}
      disabled={disabled || loading}
      className="flex-1 flex items-center justify-center gap-2 sm:gap-2.5 md:gap-3 py-2.5 sm:py-3 md:py-3.5 px-3 sm:px-4 md:px-5 border border-gray-300 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-xs sm:text-sm md:text-base font-medium min-h-[44px] touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed"
      aria-label={t('auth.signInWithApple')}
      aria-busy={loading}
    >
      <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        />
      </svg>
      <span className="text-gray-700 font-medium truncate">
        {loading ? t('common.loading') : 'Apple'}
      </span>
    </button>
  )
}
