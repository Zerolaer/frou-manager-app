import React, { memo, useMemo, useCallback } from 'react'

// Optimized button component with memo
interface OptimizedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export const OptimizedButton = memo<OptimizedButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}) => {
  const buttonClasses = useMemo(() => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
    
    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
    }
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    }
    
    const disabledClasses = 'opacity-50 cursor-not-allowed'
    
    return [
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      (disabled || loading) ? disabledClasses : '',
      className
    ].filter(Boolean).join(' ')
  }, [variant, size, disabled, loading, className])

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
      )}
      {children}
    </button>
  )
})

OptimizedButton.displayName = 'OptimizedButton'

// Optimized input component
interface OptimizedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const OptimizedInput = memo<OptimizedInputProps>(({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  const inputClasses = useMemo(() => {
    const baseClasses = 'w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors'
    const errorClasses = error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
    
    return `${baseClasses} ${errorClasses} focus:ring-2 focus:border-transparent ${className}`
  }, [error, className])

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input className={inputClasses} {...props} />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
})

OptimizedInput.displayName = 'OptimizedInput'

// Optimized card component
interface OptimizedCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export const OptimizedCard = memo<OptimizedCardProps>(({
  children,
  className = '',
  hover = false,
  onClick
}) => {
  const cardClasses = useMemo(() => {
    const baseClasses = 'rounded-xl border bg-white shadow-sm'
    const hoverClasses = hover ? 'hover:shadow-md transition-shadow cursor-pointer' : ''
    const clickableClasses = onClick ? 'cursor-pointer' : ''
    
    return `${baseClasses} ${hoverClasses} ${clickableClasses} ${className}`
  }, [hover, onClick, className])

  return (
    <div className={cardClasses} onClick={onClick}>
      {children}
    </div>
  )
})

OptimizedCard.displayName = 'OptimizedCard'

// Optimized list item component
interface OptimizedListItemProps {
  children: React.ReactNode
  onClick?: () => void
  selected?: boolean
  className?: string
}

export const OptimizedListItem = memo<OptimizedListItemProps>(({
  children,
  onClick,
  selected = false,
  className = ''
}) => {
  const itemClasses = useMemo(() => {
    const baseClasses = 'px-4 py-2 text-sm transition-colors'
    const selectedClasses = selected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
    const clickableClasses = onClick ? 'cursor-pointer' : ''
    
    return `${baseClasses} ${selectedClasses} ${clickableClasses} ${className}`
  }, [selected, onClick, className])

  return (
    <div className={itemClasses} onClick={onClick}>
      {children}
    </div>
  )
})

OptimizedListItem.displayName = 'OptimizedListItem'

// Optimized modal component
interface OptimizedModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export const OptimizedModal = memo<OptimizedModalProps>(({
  open,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  const sizeClasses = useMemo(() => {
    const sizeMap = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl'
    }
    return sizeMap[size]
  }, [size])

  if (!open) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
    >
      <div className={`bg-white rounded-xl shadow-xl w-full ${sizeClasses}`}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
})

OptimizedModal.displayName = 'OptimizedModal'
