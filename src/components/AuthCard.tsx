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
    <div className="w-full max-w-md bg-white rounded-3xl border border-[#E9F2F6]">
      {/* Header */}
      <div className="px-6 pt-6">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subTitle && <div className="text-sm text-gray-600 mt-1">{subTitle}</div>}
      </div>
      {/* Divider */}
      <div className="h-px bg-gray-200 my-5" />
      {/* Content */}
      <div className="px-6 pb-5">
        {children}
      </div>
      {/* Divider */}
      {footer && <div className="h-px bg-gray-200" />}
      {/* Footer */}
      {footer && <div className="px-6 py-4">{footer}</div>}
    </div>
  )
}
