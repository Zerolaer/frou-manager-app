import { useToast } from './toast'

export function useErrorHandler() {
  const { push } = useToast()

  const handleError = (error: unknown, context?: string) => {
    console.error(context ? `[${context}] Error:` : 'Error:', error)
    
    let message = 'Произошла ошибка'
    
    if (error instanceof Error) {
      message = error.message
    } else if (typeof error === 'string') {
      message = error
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = String(error.message)
    }
    
    push({
      title: 'Ошибка',
      message: context ? `${context}: ${message}` : message,
      duration: 5000
    })
  }

  const handleSuccess = (message: string, context?: string) => {
    push({
      title: 'Успешно',
      message: context ? `${context}: ${message}` : message,
      duration: 3000
    })
  }

  return { handleError, handleSuccess }
}
