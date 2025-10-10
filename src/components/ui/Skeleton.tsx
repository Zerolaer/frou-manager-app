import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

/**
 * Skeleton loading component
 * 
 * Usage:
 * ```tsx
 * <Skeleton variant="text" />
 * <Skeleton variant="circular" width={40} height={40} />
 * <Skeleton variant="rectangular" height={200} />
 * ```
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  className,
  style,
  ...props
}: SkeletonProps) {
  const baseStyles = "bg-gray-200 dark:bg-gray-700"
  
  const variantStyles = {
    text: "rounded h-4 w-full",
    circular: "rounded-full",
    rectangular: "rounded-lg"
  }

  const animationStyles = {
    pulse: "animate-pulse",
    wave: "animate-wave",
    none: ""
  }

  const dimensions = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  }

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{
        ...dimensions,
        ...style
      }}
      aria-busy="true"
      aria-live="polite"
      role="status"
      {...props}
    />
  )
}

/**
 * Skeleton for task cards
 */
export function TaskCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton variant="circular" width={20} height={20} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={60} height={24} />
        <Skeleton variant="rectangular" width={60} height={24} />
      </div>
    </div>
  )
}

/**
 * Skeleton for finance rows
 */
export function FinanceRowSkeleton() {
  return (
    <div className="flex items-center gap-2 py-2 border-b">
      <Skeleton variant="text" width={150} />
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" width={60} height={32} />
      ))}
    </div>
  )
}

/**
 * Skeleton for widget cards
 */
export function WidgetSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width={120} height={24} />
        <Skeleton variant="circular" width={32} height={32} />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="70%" />
      </div>
    </div>
  )
}

/**
 * Skeleton for list items
 */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 border-b">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="40%" height={12} />
      </div>
    </div>
  )
}

/**
 * Skeleton for page loading
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="rectangular" width={120} height={40} />
      </div>
      
      {/* Content grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <WidgetSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

