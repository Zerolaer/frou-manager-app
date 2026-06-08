import React from 'react'
import FrovoLogoMark from './FrovoLogoMark'
import { cn } from '@/lib/utils'

type Props = {
  /** Кнопка справа (например «+») */
  action?: React.ReactNode
  className?: string
}

/** Минималистичная шапка: логотип-кнопка + опциональное действие */
export default function MobileTopBar({ action, className }: Props) {
  return (
    <header
      className={cn(
        'mobile-top-bar sticky top-0 z-40 border-b border-outline/80 bg-background/90 backdrop-blur-md',
        className
      )}
    >
      <div className="flex h-11 items-center justify-between gap-2 px-3">
        <FrovoLogoMark />
        {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
      </div>
    </header>
  )
}
