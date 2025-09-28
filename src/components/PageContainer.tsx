import React from 'react'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  )
}
