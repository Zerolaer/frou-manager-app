// Monitoring and logging utilities

export interface LogEntry {
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context?: any
  userId?: string
  sessionId?: string
}

export interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  context?: any
}

export interface ErrorReport {
  message: string
  stack?: string
  url: string
  userAgent: string
  timestamp: number
  userId?: string
  sessionId?: string
  context?: any
}

// Log levels
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
} as const

// Logger class
class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 1000
  private currentLevel = LOG_LEVELS.INFO
  private sessionId = this.generateSessionId()

  constructor() {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.error('Unhandled error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      })
    })

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      })
    })
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private addLog(level: keyof typeof LOG_LEVELS, message: string, context?: any) {
    if (LOG_LEVELS[level] < this.currentLevel) return

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level: level.toLowerCase() as LogEntry['level'],
      message,
      context,
      sessionId: this.sessionId
    }

    this.logs.push(logEntry)

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Send to console in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level.toLowerCase() as keyof Console
      if (typeof console[consoleMethod] === 'function') {
        (console[consoleMethod] as Function)(`[${level}] ${message}`, context)
      }
    }

    // Send to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(logEntry)
    }
  }

  private async sendToExternalService(logEntry: LogEntry) {
    try {
      // Send to your monitoring service (e.g., Sentry, LogRocket, etc.)
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry)
      })
    } catch (error) {
      // Fallback: store in localStorage
      try {
        const stored = localStorage.getItem('pendingLogs') || '[]'
        const logs = JSON.parse(stored)
        logs.push(logEntry)
        localStorage.setItem('pendingLogs', JSON.stringify(logs.slice(-100))) // Keep last 100
      } catch (storageError) {
        console.error('Failed to store log:', storageError)
      }
    }
  }

  debug(message: string, context?: any) {
    this.addLog('DEBUG', message, context)
  }

  info(message: string, context?: any) {
    this.addLog('INFO', message, context)
  }

  warn(message: string, context?: any) {
    this.addLog('WARN', message, context)
  }

  error(message: string, context?: any) {
    this.addLog('ERROR', message, context)
  }

  setLevel(level: keyof typeof LOG_LEVELS) {
    this.currentLevel = LOG_LEVELS[level]
  }

  getLogs(level?: LogEntry['level']): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level)
    }
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
  }

  getSessionId(): string {
    return this.sessionId
  }
}

// Global logger instance
export const logger = new Logger()

// Performance monitoring
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private observers: PerformanceObserver[] = []

  constructor() {
    this.initializeObservers()
  }

  private initializeObservers() {
    if ('PerformanceObserver' in window) {
      // Observe navigation timing
      try {
        const navObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach(entry => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming
              this.recordMetric('navigation.load', navEntry.loadEventEnd - navEntry.navigationStart)
              this.recordMetric('navigation.domContentLoaded', navEntry.domContentLoadedEventEnd - navEntry.navigationStart)
              this.recordMetric('navigation.firstPaint', navEntry.responseEnd - navEntry.requestStart)
            }
          })
        })
        navObserver.observe({ entryTypes: ['navigation'] })
        this.observers.push(navObserver)
      } catch (error) {
        logger.warn('Failed to initialize navigation observer', { error })
      }

      // Observe resource timing
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach(entry => {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming
              this.recordMetric('resource.load', resourceEntry.duration, {
                name: resourceEntry.name,
                type: this.getResourceType(resourceEntry.name)
              })
            }
          })
        })
        resourceObserver.observe({ entryTypes: ['resource'] })
        this.observers.push(resourceObserver)
      } catch (error) {
        logger.warn('Failed to initialize resource observer', { error })
      }

      // Observe long tasks
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach(entry => {
            this.recordMetric('longtask.duration', entry.duration, {
              startTime: entry.startTime
            })
          })
        })
        longTaskObserver.observe({ entryTypes: ['longtask'] })
        this.observers.push(longTaskObserver)
      } catch (error) {
        logger.warn('Failed to initialize long task observer', { error })
      }
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script'
    if (url.includes('.css')) return 'stylesheet'
    if (url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) return 'image'
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font'
    return 'other'
  }

  recordMetric(name: string, value: number, context?: any) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      context
    }

    this.metrics.push(metric)

    // Keep only recent metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }

    logger.debug(`Performance metric: ${name}`, { value, context })
  }

  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    
    this.recordMetric(`function.${name}`, end - start)
    return result
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    
    this.recordMetric(`async.${name}`, end - start)
    return result
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(metric => metric.name === name)
    }
    return [...this.metrics]
  }

  getAverageMetric(name: string): number {
    const metrics = this.getMetrics(name)
    if (metrics.length === 0) return 0
    
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0)
    return sum / metrics.length
  }

  clearMetrics() {
    this.metrics = []
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Global performance monitor
export const performanceMonitor = new PerformanceMonitor()

// Error reporting
class ErrorReporter {
  private errors: ErrorReport[] = []

  reportError(error: Error, context?: any) {
    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      sessionId: logger.getSessionId(),
      context
    }

    this.errors.push(report)

    // Keep only recent errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100)
    }

    logger.error('Error reported', report)

    // Send to external service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(report)
    }
  }

  private async sendToExternalService(report: ErrorReport) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      })
    } catch (error) {
      logger.error('Failed to send error report', { error, report })
    }
  }

  getErrors(): ErrorReport[] {
    return [...this.errors]
  }

  clearErrors() {
    this.errors = []
  }
}

// Global error reporter
export const errorReporter = new ErrorReporter()

// User analytics
class UserAnalytics {
  private events: Array<{
    event: string
    properties?: any
    timestamp: number
  }> = []

  track(event: string, properties?: any) {
    const eventData = {
      event,
      properties,
      timestamp: Date.now()
    }

    this.events.push(eventData)
    logger.info(`Analytics event: ${event}`, properties)

    // Send to external service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(eventData)
    }
  }

  private async sendToExternalService(eventData: any) {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      })
    } catch (error) {
      logger.warn('Failed to send analytics event', { error, eventData })
    }
  }

  getEvents(): any[] {
    return [...this.events]
  }

  clearEvents() {
    this.events = []
  }
}

// Global analytics
export const analytics = new UserAnalytics()

// Utility functions
export function withLogging<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: any[]) => {
    logger.debug(`Function called: ${name}`, { args })
    const start = performance.now()
    
    try {
      const result = fn(...args)
      
      if (result instanceof Promise) {
        return result
          .then(value => {
            const end = performance.now()
            logger.debug(`Function completed: ${name}`, { 
              duration: end - start,
              result: value 
            })
            return value
          })
          .catch(error => {
            const end = performance.now()
            logger.error(`Function failed: ${name}`, { 
              duration: end - start,
              error: error.message 
            })
            throw error
          })
      } else {
        const end = performance.now()
        logger.debug(`Function completed: ${name}`, { 
          duration: end - start,
          result 
        })
        return result
      }
    } catch (error) {
      const end = performance.now()
      logger.error(`Function failed: ${name}`, { 
        duration: end - start,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }) as T
}

export function withErrorReporting<T extends (...args: any[]) => any>(
  fn: T,
  context?: string
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args)
      
      if (result instanceof Promise) {
        return result.catch(error => {
          errorReporter.reportError(
            error instanceof Error ? error : new Error(String(error)),
            { context, args }
          )
          throw error
        })
      }
      
      return result
    } catch (error) {
      errorReporter.reportError(
        error instanceof Error ? error : new Error(String(error)),
        { context, args }
      )
      throw error
    }
  }) as T
}

