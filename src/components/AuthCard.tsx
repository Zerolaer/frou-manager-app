import React from 'react'

export default function AuthCard({
  title,
  subTitle,
  children,
  footer
}: {
  title: string
  subTitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-gray-200">
      {/* Header */}
      <div className="px-5 pt-5">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subTitle && <div className="text-sm text-gray-500 mt-1">{subTitle}</div>}
      </div>
      {/* Divider */}
      <div className="h-px bg-gray-200 my-4" />
      {/* Content */}
      <div className="px-5 pb-4">
        {children}
      </div>
      {/* Divider */}
      {footer && <div className="h-px bg-gray-200 my-4" />}
      {/* Footer */}
      {footer && <div className="px-5 pb-5">{footer}</div>}
    </div>
  )
}
