import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface NotificationProps {
  id?: string
  title?: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onClose?: () => void
  className?: string
  persistent?: boolean
}

/**
 * Universal notification component
 * 
 * Usage:
 * ```tsx
 * <Notification
 *   message="Task saved successfully!"
 *   type="success"
 *   duration={3000}
 *   onClose={() => console.log('Notification closed')}
 * />
 * ```
 */
export function Notification({
  id,
  title,
  message,
  type = 'info',
  duration = 5000,
  onClose,
  className,
  persistent = false
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (persistent || duration === 0) return

    const timer = setTimeout(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, 200)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, persistent, onClose])

  const handleClose = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, 200)
  }

  if (!isVisible) return null

  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }

  const iconStyles = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600'
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 max-w-sm w-full',
        'border rounded-lg shadow-lg p-4',
        'transform transition-all duration-200',
        isAnimating ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0',
        typeStyles[type],
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex-shrink-0 text-lg', iconStyles[type])}>
          {icons[type]}
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-semibold text-sm mb-1">
              {title}
            </h4>
          )}
          <p className="text-sm leading-relaxed">
            {message}
          </p>
        </div>
        
        <button
          onClick={handleClose}
          className={cn(
            'flex-shrink-0 ml-2 p-1 rounded-full',
            'hover:bg-black/10 transition-colors',
            iconStyles[type]
          )}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  )
}

/**
 * Notification container for managing multiple notifications
 */
export function NotificationContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {children}
    </div>
  )
}

/**
 * Hook for managing notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationProps[]>([])

  const addNotification = (notification: Omit<NotificationProps, 'id'>) => {
    const id = crypto.randomUUID()
    const newNotification = { ...notification, id }
    
    setNotifications(prev => [...prev, newNotification])
    
    return id
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const showSuccess = (message: string, options?: Partial<NotificationProps>) => {
    return addNotification({ ...options, message, type: 'success' })
  }

  const showError = (message: string, options?: Partial<NotificationProps>) => {
    return addNotification({ ...options, message, type: 'error' })
  }

  const showWarning = (message: string, options?: Partial<NotificationProps>) => {
    return addNotification({ ...options, message, type: 'warning' })
  }

  const showInfo = (message: string, options?: Partial<NotificationProps>) => {
    return addNotification({ ...options, message, type: 'info' })
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}
