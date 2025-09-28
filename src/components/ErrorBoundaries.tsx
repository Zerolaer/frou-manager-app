import React, { Component, ErrorInfo, ReactNode } from 'react'
import { useErrorHandler } from '@/lib/errorHandler'
import { AccessibleButton } from './AccessibleComponents'
import { ARIA_LABELS } from '@/lib/accessibility'

interface PageErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  retryCount: number
}

interface PageErrorBoundaryProps {
  children: ReactNode
  pageName: string
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  maxRetries?: number
}

export class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: PageErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<PageErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { pageName, onError, maxRetries = 3 } = this.props
    const { retryCount } = this.state

    // Log error
    console.error(`Error in ${pageName}:`, error, errorInfo)
    
    // Call custom error handler
    onError?.(error, errorInfo)

    // Auto-retry logic
    if (retryCount < maxRetries) {
      this.retryTimeoutId = setTimeout(() => {
        this.setState(prevState => ({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          retryCount: prevState.retryCount + 1
        }))
      }, Math.pow(2, retryCount) * 1000) // Exponential backoff
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: this.state.retryCount + 1
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0
    })
  }

  render() {
    if (this.state.hasError) {
      const { pageName, fallback } = this.props
      const { error, retryCount } = this.state

      if (fallback) {
        return fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-red-500 text-2xl">⚠️</div>
              <div>
                <h2 className="text-lg font-semibold text-red-600">
                  Ошибка в {pageName}
                </h2>
                <p className="text-sm text-gray-600">
                  Произошла неожиданная ошибка. Попробуйте обновить страницу.
                </p>
              </div>
            </div>

            {process.env.NODE_ENV === 'development' && error && (
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
              <AccessibleButton
                variant="primary"
                size="sm"
                onClick={this.handleRetry}
                ariaLabel={`Попробовать снова (попытка ${retryCount + 1})`}
              >
                Попробовать снова
              </AccessibleButton>
              
              <AccessibleButton
                variant="secondary"
                size="sm"
                onClick={this.handleReset}
                ariaLabel="Сбросить и начать заново"
              >
                Сбросить
              </AccessibleButton>
              
              <AccessibleButton
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                ariaLabel="Обновить страницу"
              >
                Обновить страницу
              </AccessibleButton>
            </div>

            {retryCount > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                Попытка {retryCount} из 3
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Async Error Boundary for handling async errors
interface AsyncErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error) => void
}

export const AsyncErrorBoundary: React.FC<AsyncErrorBoundaryProps> = ({
  children,
  fallback,
  onError
}) => {
  const [hasError, setHasError] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const handleAsyncError = (event: ErrorEvent) => {
      setHasError(true)
      setError(event.error)
      onError?.(event.error)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setHasError(true)
      setError(event.reason)
      onError?.(event.reason)
    }

    window.addEventListener('error', handleAsyncError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleAsyncError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [onError])

  if (hasError && error) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="text-red-500">⚠️</div>
          <div>
            <h3 className="text-sm font-medium text-red-800">Ошибка загрузки</h3>
            <p className="text-xs text-red-600">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Feature Error Boundary for specific features
interface FeatureErrorBoundaryProps {
  featureName: string
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error) => void
}

export const FeatureErrorBoundary: React.FC<FeatureErrorBoundaryProps> = ({
  featureName,
  children,
  fallback,
  onError
}) => {
  const [hasError, setHasError] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const handleError = React.useCallback((error: Error) => {
    setHasError(true)
    setError(error)
    onError?.(error)
  }, [onError])

  React.useEffect(() => {
    if (hasError) {
      // Auto-recover after 5 seconds
      const timeout = setTimeout(() => {
        setHasError(false)
        setError(null)
      }, 5000)

      return () => clearTimeout(timeout)
    }
  }, [hasError])

  if (hasError && error) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-orange-500">⚠️</div>
            <div>
              <h4 className="text-sm font-medium text-orange-800">
                Ошибка в {featureName}
              </h4>
              <p className="text-xs text-orange-600">
                Функция временно недоступна
              </p>
            </div>
          </div>
          <AccessibleButton
            variant="ghost"
            size="sm"
            onClick={() => {
              setHasError(false)
              setError(null)
            }}
            ariaLabel="Попробовать снова"
          >
            ↻
          </AccessibleButton>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// App-level error boundary
export const AppErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <PageErrorBoundary
      pageName="Приложение"
      onError={(error, errorInfo) => {
        console.error('App error:', error, errorInfo)
      }}
    >
      {children}
    </PageErrorBoundary>
  )
}
