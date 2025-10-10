import React, { forwardRef, useRef, useEffect, useCallback } from 'react'
import { 
  ARIA_LABELS, 
  ARIA_ROLES, 
  generateId, 
  announceToScreenReader,
  FocusManager,
  KEYBOARD_KEYS,
  srOnly,
  SkipLink
} from '@/lib/accessibility'

// Accessible Button Component
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
  ariaLabel?: string
  ariaDescribedBy?: string
  announceOnClick?: string
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  ariaLabel,
  ariaDescribedBy,
  announceOnClick,
  onClick,
  disabled,
  ...props
}, ref) => {
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (announceOnClick) {
      announceToScreenReader(announceOnClick)
    }
    onClick?.(e)
  }, [onClick, announceOnClick])

  const buttonClasses = React.useMemo(() => {
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
      ref={ref || buttonRef}
      className={buttonClasses}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading && (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
          <span className="sr-only">Загрузка...</span>
        </>
      )}
      {children}
    </button>
  )
})

AccessibleButton.displayName = 'AccessibleButton'

// Accessible Modal Component
interface AccessibleModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  ariaLabel?: string
  ariaDescribedBy?: string
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  open,
  onClose,
  title,
  children,
  size = 'md',
  ariaLabel,
  ariaDescribedBy
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const focusManager = useRef(new FocusManager())
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (open) {
      // Save current focus
      focusManager.current.saveFocus()
      
      // Focus first element in modal
      setTimeout(() => {
        if (modalRef.current) {
          focusManager.current.focusFirst(modalRef.current)
          
          // Trap focus
          cleanupRef.current = focusManager.current.trapFocus(modalRef.current) ?? null
        }
      }, 0)
    } else {
      // Restore focus
      focusManager.current.restoreFocus()
      
      // Cleanup focus trap
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [open])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === KEYBOARD_KEYS.ESCAPE) {
      onClose()
    }
  }, [onClose])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  const sizeClasses = React.useMemo(() => {
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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div 
        ref={modalRef}
        className={`bg-white rounded-xl shadow-2xl ring-1 ring-black/10 border border-gray-200 w-full ${sizeClasses}`}
        role={ARIA_ROLES.DIALOG}
        aria-modal="true"
        aria-label={ariaLabel || title}
        aria-describedby={ariaDescribedBy}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
            <AccessibleButton
              variant="ghost"
              size="sm"
              onClick={onClose}
              ariaLabel={ARIA_LABELS.CLOSE}
            >
              ✕
            </AccessibleButton>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

// Accessible Input Component
interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helperText?: string
  required?: boolean
  describedBy?: string
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(({
  label,
  error,
  helperText,
  required = false,
  describedBy,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || generateId('input')
  const errorId = error ? generateId('error') : undefined
  const helperId = helperText ? generateId('helper') : undefined
  
  const describedByIds = [describedBy, errorId, helperId].filter(Boolean).join(' ') || undefined

  const inputClasses = React.useMemo(() => {
    const baseClasses = 'w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors'
    const errorClasses = error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
    
    return `${baseClasses} ${errorClasses} focus:ring-2 focus:border-transparent ${className}`
  }, [error, className])

  return (
    <div className="space-y-1">
      <label 
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="обязательное поле">*</span>}
      </label>
      
      <input
        ref={ref}
        id={inputId}
        className={inputClasses}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedByIds}
        {...props}
      />
      
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p id={helperId} className="text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  )
})

AccessibleInput.displayName = 'AccessibleInput'

// Accessible List Component
interface AccessibleListProps {
  items: Array<{
    id: string
    content: React.ReactNode
    onClick?: () => void
    selected?: boolean
    disabled?: boolean
  }>
  role?: 'listbox' | 'menu' | 'list'
  ariaLabel?: string
  className?: string
}

export const AccessibleList: React.FC<AccessibleListProps> = ({
  items,
  role = ARIA_ROLES.LIST,
  ariaLabel,
  className = ''
}) => {
  const [focusedIndex, setFocusedIndex] = React.useState(-1)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case KEYBOARD_KEYS.ARROW_DOWN:
        e.preventDefault()
        setFocusedIndex(prev => Math.min(prev + 1, items.length - 1))
        break
      case KEYBOARD_KEYS.ARROW_UP:
        e.preventDefault()
        setFocusedIndex(prev => Math.max(prev - 1, 0))
        break
      case KEYBOARD_KEYS.ENTER:
      case KEYBOARD_KEYS.SPACE:
        if (focusedIndex >= 0 && items[focusedIndex].onClick) {
          e.preventDefault()
          items[focusedIndex].onClick?.()
        }
        break
      case KEYBOARD_KEYS.HOME:
        e.preventDefault()
        setFocusedIndex(0)
        break
      case KEYBOARD_KEYS.END:
        e.preventDefault()
        setFocusedIndex(items.length - 1)
        break
    }
  }, [focusedIndex, items])

  return (
    <ul
      role={role}
      aria-label={ariaLabel}
      className={className}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          role={role === 'listbox' ? 'option' : role === 'menu' ? 'menuitem' : 'listitem'}
          aria-selected={item.selected}
          aria-disabled={item.disabled}
          className={`
            cursor-pointer px-4 py-2 text-sm transition-colors
            ${item.selected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}
            ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${focusedIndex === index ? 'ring-2 ring-blue-500' : ''}
          `}
          onClick={item.disabled ? undefined : item.onClick}
          onMouseEnter={() => setFocusedIndex(index)}
        >
          {item.content}
        </li>
      ))}
    </ul>
  )
}

// Skip Links Component
export const SkipLinks: React.FC = () => {
  return (
    <nav aria-label="Пропустить навигацию">
      <SkipLink href="#main-content">
        Перейти к основному содержанию
      </SkipLink>
      <SkipLink href="#main-navigation">
        Перейти к главному меню
      </SkipLink>
      <SkipLink href="#sidebar">
        Перейти к боковой панели
      </SkipLink>
    </nav>
  )
}

// Screen Reader Only Text
interface SrOnlyProps {
  children: React.ReactNode
}

export const SrOnly: React.FC<SrOnlyProps> = ({ children }) => (
  <span className="sr-only" style={srOnly.style}>
    {children}
  </span>
)
