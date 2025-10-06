/**
 * Page-specific Skeleton Screens
 * Accurately match real content layout to prevent layout shift
 */

import React from 'react'

// ==================== Base Skeleton Component ====================

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'shimmer' | 'pulse'
}

function Skeleton({ className = '', variant = 'shimmer' }: SkeletonProps) {
  const variantClasses = {
    default: 'bg-gray-200',
    shimmer: 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer',
    pulse: 'bg-gray-200 animate-pulse'
  }

  return <div className={`rounded ${variantClasses[variant]} ${className}`} />
}

// ==================== Dashboard Skeleton ====================

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Widget 1 - Large */}
        <div className="md:col-span-2 lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-32 w-full mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Widget 2 - Small */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-16 w-16 rounded-full mx-auto mb-3" />
          <Skeleton className="h-8 w-24 mx-auto mb-2" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>

        {/* Widget 3 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Widget 4 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <Skeleton className="h-6 w-36 mb-4" />
          <Skeleton className="h-24 w-full mb-3" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        {/* Widget 5 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== Tasks Week Skeleton ====================

export function TasksWeekSkeleton() {
  return (
    <div className="flex gap-4 p-4">
      {/* 7 days */}
      {[...Array(7)].map((_, dayIndex) => (
        <div key={dayIndex} className="flex-1 min-w-[200px]">
          {/* Day header */}
          <div className="bg-white rounded-t-lg p-3 border-b">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
          
          {/* Task cards */}
          <div className="bg-gray-50 rounded-b-lg p-3 space-y-2 min-h-[400px]">
            {[...Array(dayIndex % 3 + 1)].map((_, taskIndex) => (
              <div key={taskIndex} className="bg-white rounded-lg p-3 border">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-3 w-3/4 mb-2" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ==================== Finance Table Skeleton ====================

export function FinanceTableSkeleton() {
  return (
    <div className="p-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 border-b">
          <Skeleton className="h-5 col-span-3" />
          {[...Array(9)].map((_, i) => (
            <Skeleton key={i} className="h-5 col-span-1" />
          ))}
        </div>

        {/* Rows */}
        {[...Array(12)].map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-12 gap-2 p-3 border-b hover:bg-gray-50">
            <Skeleton className="h-6 col-span-3" />
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-6 col-span-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================== Notes Grid Skeleton ====================

export function NotesGridSkeleton() {
  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* Masonry Grid */}
      <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
        {[...Array(12)].map((_, i) => (
          <div 
            key={i} 
            className="break-inside-avoid bg-white rounded-lg border p-4"
            style={{ height: `${120 + (i % 3) * 80}px` }}
          >
            <Skeleton className="h-5 w-3/4 mb-3" />
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-2/3 mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================== Goals List Skeleton ====================

export function GoalsListSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Goal cards */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-96 mb-1" />
              <Skeleton className="h-4 w-80" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
          
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ==================== Generic Card Skeleton ====================

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border p-6">
          <Skeleton className="h-5 w-3/4 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6 mb-4" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ==================== Add shimmer animation to global CSS ====================

// Add this to your global CSS or index.css:
/*
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}
*/

