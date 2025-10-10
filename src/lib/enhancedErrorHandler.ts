import { logger } from '@/lib/monitoring'
import { useToast } from './toast'

// This will be used when NotificationProvider is available
let notificationContext: any = null

export function setNotificationContext(context: any) {
  notificationContext = context
}

export function useEnhancedErrorHandler() {
  const { push } = useToast()

  const handleError = (error: unknown, context?: string) => {
    logger.error(context ? `[${context}] Error:` : 'Error:', error)
    
    let message = 'Произошла ошибка'
    
    if (error instanceof Error) {
      message = error.message
    } else if (typeof error === 'string') {
      message = error
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = String(error.message)
    }
    
    const fullMessage = context ? `${context}: ${message}` : message
    
    // Use notifications if available, otherwise fallback to toast
    if (notificationContext) {
      notificationContext.showError(fullMessage, { title: 'Ошибка' })
    } else {
      push({
        title: 'Ошибка',
        message: fullMessage,
        duration: 5000
      })
    }
  }

  const handleSuccess = (message: string, context?: string) => {
    const fullMessage = context ? `${context}: ${message}` : message
    
    // Use notifications if available, otherwise fallback to toast
    if (notificationContext) {
      notificationContext.showSuccess(fullMessage, { title: 'Успешно' })
    } else {
      push({
        title: 'Успешно',
        message: fullMessage,
        duration: 3000
      })
    }
  }

  const handleWarning = (message: string, context?: string) => {
    const fullMessage = context ? `${context}: ${message}` : message
    
    // Use notifications if available, otherwise fallback to toast
    if (notificationContext) {
      notificationContext.showWarning(fullMessage, { title: 'Предупреждение' })
    } else {
      push({
        title: 'Предупреждение',
        message: fullMessage,
        duration: 4000
      })
    }
  }

  const handleInfo = (message: string, context?: string) => {
    const fullMessage = context ? `${context}: ${message}` : message
    
    // Use notifications if available, otherwise fallback to toast
    if (notificationContext) {
      notificationContext.showInfo(fullMessage, { title: 'Информация' })
    } else {
      push({
        title: 'Информация',
        message: fullMessage,
        duration: 3000
      })
    }
  }

  return { handleError, handleSuccess, handleWarning, handleInfo }
}
