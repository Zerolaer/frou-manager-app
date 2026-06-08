import React from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'

export default function AuthDivider() {
  const { t } = useSafeTranslation()
  return (
    <div className="relative mb-4 sm:mb-5 md:mb-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-300" />
      </div>
      <div className="relative flex justify-center text-xs sm:text-sm">
        <span className="px-2 sm:px-3 bg-white text-gray-500">{t('auth.orContinueWith')}</span>
      </div>
    </div>
  )
}
