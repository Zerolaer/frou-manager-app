import React, { createContext, useContext, ReactNode, useEffect } from 'react'
import { useNotifications, Notification } from './ui/Notification'
import { NotificationContainer } from './ui/Notification'
import { setNotificationContext } from '@/lib/enhancedErrorHandler'

interface NotificationContextType {
  showSuccess: (message: string, options?: any) => string
  showError: (message: string, options?: any) => string
  showWarning: (message: string, options?: any) => string
  showInfo: (message: string, options?: any) => string
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const notifications = useNotifications()

  // Set global notification context for enhanced error handler
  useEffect(() => {
    setNotificationContext(notifications)
  }, [notifications])

  return (
    <NotificationContext.Provider value={notifications}>
      {children}
      <NotificationContainer>
        {notifications.notifications.map(notification => (
          <Notification
            key={notification.id}
            {...notification}
            onClose={() => notifications.removeNotification(notification.id!)}
          />
        ))}
      </NotificationContainer>
    </NotificationContext.Provider>
  )
}
