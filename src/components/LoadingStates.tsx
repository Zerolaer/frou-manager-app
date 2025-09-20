import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`} />
  )
}

interface LoadingStateProps {
  loading: boolean
  error?: Error | null
  empty?: boolean
  emptyMessage?: string
  children: React.ReactNode
  loadingComponent?: React.ReactNode
}

export function LoadingState({ 
  loading, 
  error, 
  empty = false, 
  emptyMessage = 'Нет данных',
  children, 
  loadingComponent 
}: LoadingStateProps) {
  if (loading) {
    return loadingComponent || (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Загрузка...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️ Ошибка загрузки</div>
          <div className="text-sm text-gray-600">{error.message}</div>
        </div>
      </div>
    )
  }

  if (empty) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          {emptyMessage}
        </div>
      </div>
    )
  }

  return <>{children}</>
}

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2 mb-4" />
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
