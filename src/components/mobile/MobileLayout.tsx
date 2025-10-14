import React from 'react'
import BottomNav from './BottomNav'

interface MobileLayoutProps {
  children: React.ReactNode
  title?: string
  action?: React.ReactNode
}

export default function MobileLayout({ children, title, action }: MobileLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      {title && (
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-14 px-4">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            {action && <div>{action}</div>}
          </div>
        </header>
      )}
      
      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}




