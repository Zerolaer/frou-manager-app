import React from 'react'

export function Skeleton({ className = '' }: { className?: string }){
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export function TableSkeleton({ rows = 6 }: { rows?: number }){
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-12 gap-2">
          <Skeleton className="h-6 col-span-3" />
          <Skeleton className="h-6 col-span-1" />
          <Skeleton className="h-6 col-span-1" />
          <Skeleton className="h-6 col-span-1" />
          <Skeleton className="h-6 col-span-1" />
          <Skeleton className="h-6 col-span-1" />
          <Skeleton className="h-6 col-span-1" />
          <Skeleton className="h-6 col-span-1" />
          <Skeleton className="h-6 col-span-1" />
          <Skeleton className="h-6 col-span-1" />
          <Skeleton className="h-6 col-span-1" />
          <Skeleton className="h-6 col-span-1" />
        </div>
      ))}
    </div>
  )
}
