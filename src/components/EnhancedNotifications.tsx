import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AccessibleButton } from './AccessibleComponents'
import { announceToScreenReader } from '@/lib/accessibility'
import { animateIn, animateOut, DURATION, EASING } from '@/lib/animations'

export interface NotificationProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  persistent?: boolean
  actions?: Array<{
    label: string
    action: () => void
    variant?: 'primary' | 'secondary' | 'danger'
  }>
  onClose?: () => void
  onAction?: (action: () => void) => void
}

export interface NotificationConfig {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  maxNotifications?: number
  defaultDuration?: number
  enableAnimations?: boolean
  enableSounds?: boolean
  enableVibrations?: boolean
}

// Default configuration
const DEFAULT_CONFIG: Required<NotificationConfig> = {
  position: 'top-right',
  maxNotifications: 5,
  defaultDuration: 5000,
  enableAnimations: true,
  enableSounds: false,
  enableVibrations: false
}

// Notification types styling
const NOTIFICATION_STYLES = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: '✅',
    iconColor: 'text-green-500',
    titleColor: 'text-green-800',
    messageColor: 'text-green-600'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: '❌',
    iconColor: 'text-red-500',
    titleColor: 'text-red-800',
    messageColor: 'text-red-600'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: '⚠️',
    iconColor: 'text-yellow-500',
    titleColor: 'text-yellow-800',
    messageColor: 'text-yellow-600'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'ℹ️',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800',
    messageColor: 'text-blue-600'
  }
} as const

// Individual notification component
const Notification: React.FC<NotificationProps & { config: Required<NotificationConfig> }> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  persistent = false,
  actions = [],
  onClose,
  config
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const styles = NOTIFICATION_STYLES[type]

  const handleClose = useCallback(() => {
    setIsExiting(true)
    
    if (config.enableAnimations && notificationRef.current) {
      animateOut(notificationRef.current, 'fadeOut', 0)
        ?.addEventListener('finish', () => {
          setIsVisible(false)
          onClose?.()
        })
    } else {
      setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, DURATION.fast)
    }
  }, [config.enableAnimations, onClose])

  const handleAction = useCallback((action: () => void) => {
    action()
    handleClose()
  }, [handleClose])

  // Auto-close timer
  useEffect(() => {
    if (persistent || duration <= 0) return

    timeoutRef.current = setTimeout(() => {
      handleClose()
    }, duration)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [duration, persistent, handleClose])

  // Announce to screen readers
  useEffect(() => {
    if (config.enableAnimations && notificationRef.current) {
      animateIn(notificationRef.current, 'slideInRight')
    }

    announceToScreenReader(`${type === 'error' ? 'Ошибка' : type === 'warning' ? 'Предупреждение' : type === 'success' ? 'Успех' : 'Информация'}: ${title}${message ? '. ' + message : ''}`)
  }, [type, title, message, config.enableAnimations])

  if (!isVisible) return null

  return (
    <div
      ref={notificationRef}
      className={`
        relative max-w-sm w-full bg-white rounded-lg shadow-lg border-l-4 p-4 mb-3
        ${styles.bg} ${styles.border}
        transform transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 scale-95 translate-x-full' : 'opacity-100 scale-100 translate-x-0'}
      `}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${styles.iconColor}`}>
          <span className="text-lg" aria-hidden="true">
            {styles.icon}
          </span>
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${styles.titleColor}`}>
            {title}
          </h3>
          
          {message && (
            <p className={`mt-1 text-sm ${styles.messageColor}`}>
              {message}
            </p>
          )}
          
          {actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {actions.map((action, index) => (
                <AccessibleButton
                  key={index}
                  variant={action.variant || 'secondary'}
                  size="sm"
                  onClick={() => handleAction(action.action)}
                  className="text-xs"
                >
                  {action.label}
                </AccessibleButton>
              ))}
            </div>
          )}
        </div>
        
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleClose}
            className={`
              inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2
              ${styles.iconColor} hover:bg-gray-100 focus:ring-gray-500
            `}
            aria-label="Закрыть уведомление"
          >
            <span className="sr-only">Закрыть</span>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Progress bar for auto-close */}
      {!persistent && duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <div 
            className={`h-full ${styles.iconColor.replace('text-', 'bg-').replace('-500', '-500')} transition-all ease-linear`}
            style={{ 
              width: '100%',
              animation: `shrink ${duration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  )
}

// Notification container
const NotificationContainer: React.FC<{
  notifications: NotificationProps[]
  config: Required<NotificationConfig>
  onRemove: (id: string) => void
}> = ({ notifications, config, onRemove }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  }

  if (notifications.length === 0) return null

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 max-w-sm w-full ${positionClasses[config.position]}`}
      aria-live="polite"
      aria-label="Уведомления"
    >
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          {...notification}
          config={config}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </div>
  )
}

// Notification context and provider
interface NotificationContextType {
  showNotification: (notification: Omit<NotificationProps, 'id'>) => string
  hideNotification: (id: string) => void
  hideAllNotifications: () => void
  updateConfig: (newConfig: Partial<NotificationConfig>) => void
}

const NotificationContext = React.createContext<NotificationContextType | null>(null)

export const NotificationProvider: React.FC<{
  children: React.ReactNode
  initialConfig?: NotificationConfig
}> = ({ children, initialConfig = {} }) => {
  const [notifications, setNotifications] = useState<NotificationProps[]>([])
  const [config, setConfig] = useState<Required<NotificationConfig>>({
    ...DEFAULT_CONFIG,
    ...initialConfig
  })

  const showNotification = useCallback((notification: Omit<NotificationProps, 'id'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newNotification = { ...notification, id }

    setNotifications(prev => {
      const updated = [newNotification, ...prev]
      
      // Limit number of notifications
      if (updated.length > config.maxNotifications) {
        return updated.slice(0, config.maxNotifications)
      }
      
      return updated
    })

    return id
  }, [config.maxNotifications])

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }, [])

  const hideAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const updateConfig = useCallback((newConfig: Partial<NotificationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }))
  }, [])

  const value = {
    showNotification,
    hideNotification,
    hideAllNotifications,
    updateConfig
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {typeof window !== 'undefined' && createPortal(
        <NotificationContainer
          notifications={notifications}
          config={config}
          onRemove={hideNotification}
        />,
        document.body
      )}
    </NotificationContext.Provider>
  )
}

// Hook to use notifications
export const useNotifications = () => {
  const context = React.useContext(NotificationContext)
  
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }

  return context
}

// Convenience functions for different notification types
export const useNotificationHelpers = () => {
  const { showNotification } = useNotifications()

  const showSuccess = useCallback((title: string, message?: string, options?: Partial<NotificationProps>) => {
    return showNotification({
      type: 'success',
      title,
      message,
      ...options
    })
  }, [showNotification])

  const showError = useCallback((title: string, message?: string, options?: Partial<NotificationProps>) => {
    return showNotification({
      type: 'error',
      title,
      message,
      duration: 0, // Don't auto-close errors
      persistent: true,
      ...options
    })
  }, [showNotification])

  const showWarning = useCallback((title: string, message?: string, options?: Partial<NotificationProps>) => {
    return showNotification({
      type: 'warning',
      title,
      message,
      duration: 7000, // Longer duration for warnings
      ...options
    })
  }, [showNotification])

  const showInfo = useCallback((title: string, message?: string, options?: Partial<NotificationProps>) => {
    return showNotification({
      type: 'info',
      title,
      message,
      ...options
    })
  }, [showNotification])

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}

// CSS for progress bar animation
const progressBarCSS = `
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}
`

// Inject CSS
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = progressBarCSS
  document.head.appendChild(styleSheet)
}
