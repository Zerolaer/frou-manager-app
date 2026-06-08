import React from 'react'
import { cn } from '@/lib/utils'
import '@/mobile-shell.css'

interface MobileLayoutProps {
  children: React.ReactNode
  className?: string
}

export default function MobileLayout({ children, className }: MobileLayoutProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background text-primary">
      <main className={cn('mobile-shell-main', className)}>{children}</main>
    </div>
  )
}
