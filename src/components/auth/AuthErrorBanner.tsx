import React from 'react'

export default function AuthErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-3 sm:mb-4 text-xs sm:text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 break-words"
    >
      {message}
    </div>
  )
}
