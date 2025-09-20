import React, { useState, useEffect } from 'react'

// Enhanced skeleton components with animations
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
    <div className="flex items-start space-x-3">
      <div className="rounded-full bg-gray-200 h-10 w-10"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-3 bg-gray-200 rounded"></div>
      <div className="h-3 bg-gray-200 rounded w-4/5"></div>
    </div>
  </div>
)

export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({ 
  count = 3, 
  className = '' 
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="animate-pulse bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="rounded-full bg-gray-200 h-8 w-8"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="h-6 bg-gray-200 rounded w-12"></div>
            <div className="h-6 bg-gray-200 rounded w-6"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
)

export const SkeletonGrid: React.FC<{ 
  count?: number; 
  columns?: number;
  className?: string;
}> = ({ count = 6, columns = 3, className = '' }) => (
  <div className={`grid gap-4 ${className}`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="animate-pulse bg-white rounded-lg border border-gray-200 p-4">
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
          <div className="flex justify-between items-center pt-2">
            <div className="h-3 bg-gray-200 rounded w-20"></div>
            <div className="h-6 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
)

export const SkeletonTable: React.FC<{ 
  rows?: number; 
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
    <div className="animate-pulse">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-20"></div>
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4 border-b border-gray-100">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="h-4 bg-gray-200 rounded w-16"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
)

// Shimmer effect for more sophisticated loading
export const ShimmerCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative overflow-hidden bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-gray-100 to-transparent"></div>
    <div className="relative">
      <div className="flex items-start space-x-3">
        <div className="rounded-full bg-gray-200 h-10 w-10"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  </div>
)

// Pulse animation for buttons
export const PulseButton: React.FC<{ 
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => (
  <button 
    className={`relative overflow-hidden bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
    onClick={onClick}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    <span className="relative">{children}</span>
  </button>
)

// Progressive loading with staggered animations
export const StaggeredList: React.FC<{ 
  children: React.ReactNode[];
  delay?: number;
}> = ({ children, delay = 100 }) => (
  <div className="space-y-3">
    {children.map((child, index) => (
      <div 
        key={index}
        className="animate-[fadeInUp_0.6s_ease-out]"
        style={{ 
          animationDelay: `${index * delay}ms`,
          animationFillMode: 'both'
        }}
      >
        {child}
      </div>
    ))}
  </div>
)

// Loading overlay with progress
interface LoadingOverlayProps {
  isLoading: boolean
  progress?: number
  message?: string
  onCancel?: () => void
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  progress,
  message = 'Загрузка...',
  onCancel
}) => {
  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center justify-center mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>
        
        <div className="text-center">
          <p className="text-gray-700 mb-2">{message}</p>
          
          {progress !== undefined && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              ></div>
            </div>
          )}
          
          {onCancel && (
            <button 
              onClick={onCancel}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Отмена
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Inline loading indicator
export const InlineLoader: React.FC<{ 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-blue-600 border-t-transparent ${sizeClasses[size]} ${className}`}></div>
  )
}

// Loading dots animation
export const LoadingDots: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex space-x-1 ${className}`}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"
        style={{
          animationDelay: `${i * 0.2}s`,
          animationDuration: '1s'
        }}
      ></div>
    ))}
  </div>
)

// Skeleton for specific components
export const NoteSkeleton: React.FC = () => (
  <div className="animate-pulse bg-white rounded-2xl border border-gray-200 p-4">
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-6 bg-gray-200 rounded-full w-6"></div>
    </div>
    <div className="space-y-2 mb-3">
      <div className="h-3 bg-gray-200 rounded w-full"></div>
      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      <div className="h-3 bg-gray-200 rounded w-4/6"></div>
    </div>
    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
      <div className="h-3 bg-gray-200 rounded w-20"></div>
      <div className="h-3 bg-gray-200 rounded w-12"></div>
    </div>
  </div>
)

export const GoalSkeleton: React.FC = () => (
  <div className="animate-pulse bg-white rounded-lg border border-gray-200 p-4">
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="h-8 bg-gray-200 rounded w-16"></div>
    </div>
    <div className="space-y-2 mb-3">
      <div className="h-2 bg-gray-200 rounded-full w-full"></div>
      <div className="flex justify-between text-xs text-gray-500">
        <div className="h-3 bg-gray-200 rounded w-16"></div>
        <div className="h-3 bg-gray-200 rounded w-12"></div>
      </div>
    </div>
    <div className="flex gap-2">
      <div className="h-6 bg-gray-200 rounded w-16"></div>
      <div className="h-6 bg-gray-200 rounded w-16"></div>
    </div>
  </div>
)

// Hook for managing loading states
export function useLoadingState(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')

  const startLoading = (msg = 'Загрузка...') => {
    setIsLoading(true)
    setProgress(0)
    setMessage(msg)
  }

  const updateProgress = (newProgress: number, newMessage?: string) => {
    setProgress(newProgress)
    if (newMessage) setMessage(newMessage)
  }

  const stopLoading = () => {
    setIsLoading(false)
    setProgress(0)
    setMessage('')
  }

  return {
    isLoading,
    progress,
    message,
    startLoading,
    updateProgress,
    stopLoading
  }
}

// Add custom animations to CSS
const animationStyles = `
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = animationStyles
  document.head.appendChild(styleSheet)
}
