import React from 'react'
import UIModal from '@/components/ui/Modal'

type Props = {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  subTitle?: React.ReactNode
  footer?: React.ReactNode
  headerRight?: React.ReactNode
  children: React.ReactNode
  /**
   * Visual size preset for content panel. Kept for back-compat.
   * - 'sm' => max-w-md
   * - 'md' => max-w-xl
   * - 'lg' => max-w-3xl
   */
  size?: 'sm' | 'md' | 'lg'
  /** Extra classes on outer container (kept for back-compat) */
  className?: string
  /** Extra classes on content panel */
  contentClassName?: string
  /** Extra classes applied around children */
  bodyClassName?: string
}

export default function Modal({
  open, onClose, title, subTitle, footer, headerRight,
  children, size = 'md', className, contentClassName, bodyClassName
}: Props){
  const sizeClass = 'w-auto'

  return (
    <UIModal
      open={open}
      onClose={onClose}
      size={size === 'lg' ? 'large' : 'default'}
      title={
        <div className="flex items-center justify-between gap-3 w-full">
          <div>
            <div className="text-base font-medium leading-none">{title}</div>
            {subTitle && <div className="mt-1 text-xs opacity-70">{subTitle}</div>}
          </div>
          {headerRight ? <div className="ml-4">{headerRight}</div> : null}
        </div>
      }
      footer={footer}
    >
      <div className={`${bodyClassName ?? ''}`}>
        <div className={`${sizeClass} ${contentClassName ?? ''} mx-auto`}>
          {children}
        </div>
      </div>
    </UIModal>
  )
}
