import React from 'react'

interface SubHeaderProps {
  title: string
  children?: React.ReactNode
  className?: string
}

export default function SubHeader({ title, children, className = '' }: SubHeaderProps) {
  return (
    <div className={`bg-white border-b border-gray-200 px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <div className="flex items-center gap-3">
          {children}
        </div>
      </div>
    </div>
  )
}
