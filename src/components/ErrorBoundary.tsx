import React from 'react'
import { useErrorHandler } from '@/lib/errorHandler'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error!} resetError={this.resetError} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="p-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-red-500 text-2xl">⚠️</div>
          <div>
            <div className="text-lg font-semibold text-red-600">Что-то пошло не так</div>
            <div className="text-sm text-gray-600">
              Произошла неожиданная ошибка в приложении
            </div>
          </div>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-4">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              Детали ошибки (только в режиме разработки)
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="flex gap-2">
          <button
            onClick={resetError}
            className="btn px-4 py-2 text-sm"
          >
            Попробовать снова
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook-based error boundary for functional components
export function useErrorBoundary() {
  const { handleError } = useErrorHandler()
  
  const captureError = React.useCallback((error: Error) => {
    handleError(error, 'Ошибка в компоненте')
  }, [handleError])

  return captureError
}
