import React from 'react'
import { 
  Skeleton, 
  TaskCardSkeleton, 
  FinanceRowSkeleton, 
  WidgetSkeleton, 
  ListItemSkeleton, 
  PageSkeleton 
} from './Skeleton'

interface LoadingButtonProps {
  loading?: boolean
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

/**
 * Button with loading state
 */
export function LoadingButton({ 
  loading = false, 
  children, 
  className = '',
  disabled = false,
  ...props 
}: LoadingButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`relative ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
    </button>
  )
}

interface LoadingCardProps {
  loading?: boolean
  children: React.ReactNode
  skeleton?: React.ReactNode
  className?: string
}

/**
 * Card with loading state
 */
export function LoadingCard({ 
  loading = false, 
  children, 
  skeleton,
  className = ''
}: LoadingCardProps) {
  if (loading) {
    return (
      <div className={className}>
        {skeleton || <Skeleton variant="rectangular" height={200} />}
      </div>
    )
  }

  return <div className={className}>{children}</div>
}

interface LoadingListProps {
  loading?: boolean
  children: React.ReactNode
  itemCount?: number
  className?: string
}

/**
 * List with loading state
 */
export function LoadingList({ 
  loading = false, 
  children, 
  itemCount = 3,
  className = ''
}: LoadingListProps) {
  if (loading) {
    return (
      <div className={className}>
        {Array.from({ length: itemCount }).map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    )
  }

  return <div className={className}>{children}</div>
}

interface LoadingGridProps {
  loading?: boolean
  children: React.ReactNode
  columns?: number
  itemCount?: number
  className?: string
}

/**
 * Grid with loading state
 */
export function LoadingGrid({ 
  loading = false, 
  children, 
  columns = 3,
  itemCount = 6,
  className = ''
}: LoadingGridProps) {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6 ${className}`}>
        {Array.from({ length: itemCount }).map((_, i) => (
          <WidgetSkeleton key={i} />
        ))}
      </div>
    )
  }

  return <div className={className}>{children}</div>
}

interface LoadingPageProps {
  loading?: boolean
  children: React.ReactNode
  className?: string
}

/**
 * Page with loading state
 */
export function LoadingPage({ 
  loading = false, 
  children, 
  className = ''
}: LoadingPageProps) {
  if (loading) {
    return <PageSkeleton />
  }

  return <div className={className}>{children}</div>
}

// Re-export skeleton components for convenience
export { 
  Skeleton, 
  TaskCardSkeleton, 
  FinanceRowSkeleton, 
  WidgetSkeleton, 
  ListItemSkeleton, 
  PageSkeleton 
}
