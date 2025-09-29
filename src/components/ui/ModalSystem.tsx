import React from 'react'
import Modal from './Modal'

// Стандартные размеры модальных окон
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

// Стандартные типы кнопок
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

// Стандартная кнопка для модальных окон
interface ModalButtonProps {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}

export function ModalButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  children,
  className = ''
}: ModalButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  }
  
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-8 px-3 text-sm',
    lg: 'h-9 px-4 text-sm'
  }
  
  const disabledClasses = 'opacity-50 cursor-not-allowed'
  
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    (disabled || loading) ? disabledClasses : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
      )}
      {children}
    </button>
  )
}

// Стандартный футер для модальных окон
interface ModalFooterProps {
  left?: React.ReactNode
  right?: React.ReactNode
  className?: string
}

export function ModalFooter({ left, right, className = '' }: ModalFooterProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div>{left}</div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  )
}

// Стандартный заголовок для модальных окон
interface ModalHeaderProps {
  title: string
  subtitle?: string
  right?: React.ReactNode
}

export function ModalHeader({ title, subtitle, right }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {right && <div>{right}</div>}
    </div>
  )
}

// Основной компонент унифицированной модальной системы
interface UnifiedModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  size?: ModalSize
  children: React.ReactNode
  footer?: React.ReactNode
  headerRight?: React.ReactNode
  closeOnOverlay?: boolean
  bodyClassName?: string
}

export function UnifiedModal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  headerRight,
  closeOnOverlay = true,
  bodyClassName
}: UnifiedModalProps) {
  // Маппинг размеров на внутренние размеры Modal
  const sizeMap = {
    sm: 'default',
    md: 'default', 
    lg: 'large',
    xl: 'large'
  } as const

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <ModalHeader
          title={title}
          subtitle={subtitle}
          right={headerRight}
        />
      }
      footer={footer}
      size={sizeMap[size]}
      closeOnOverlay={closeOnOverlay}
      bodyClassName={bodyClassName}
    >
      {children}
    </Modal>
  )
}

// Хук для стандартных действий модальных окон
export function useModalActions() {
  const createStandardFooter = (
    primaryAction: { label: string; onClick: () => void; loading?: boolean; disabled?: boolean },
    secondaryAction?: { label: string; onClick: () => void },
    leftAction?: React.ReactNode
  ) => {
    return (
      <ModalFooter
        left={leftAction}
        right={
          <>
            {secondaryAction && (
              <ModalButton
                variant="secondary"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </ModalButton>
            )}
            <ModalButton
              variant="primary"
              onClick={primaryAction.onClick}
              loading={primaryAction.loading}
              disabled={primaryAction.disabled}
            >
              {primaryAction.label}
            </ModalButton>
          </>
        }
      />
    )
  }

  // Создание футера с негативным действием слева
  const createDangerFooter = (
    dangerAction: { label: string; onClick: () => void; loading?: boolean; disabled?: boolean },
    primaryAction: { label: string; onClick: () => void; loading?: boolean; disabled?: boolean },
    secondaryAction?: { label: string; onClick: () => void }
  ) => {
    return (
      <ModalFooter
        left={
          <ModalButton
            variant="danger"
            onClick={dangerAction.onClick}
            loading={dangerAction.loading}
            disabled={dangerAction.disabled}
          >
            {dangerAction.label}
          </ModalButton>
        }
        right={
          <>
            {secondaryAction && (
              <ModalButton
                variant="secondary"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </ModalButton>
            )}
            <ModalButton
              variant="primary"
              onClick={primaryAction.onClick}
              loading={primaryAction.loading}
              disabled={primaryAction.disabled}
            >
              {primaryAction.label}
            </ModalButton>
          </>
        }
      />
    )
  }

  // Создание футера только с позитивным действием справа
  const createSimpleFooter = (
    primaryAction: { label: string; onClick: () => void; loading?: boolean; disabled?: boolean },
    secondaryAction?: { label: string; onClick: () => void }
  ) => {
    return (
      <ModalFooter
        right={
          <>
            {secondaryAction && (
              <ModalButton
                variant="secondary"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </ModalButton>
            )}
            <ModalButton
              variant="primary"
              onClick={primaryAction.onClick}
              loading={primaryAction.loading}
              disabled={primaryAction.disabled}
            >
              {primaryAction.label}
            </ModalButton>
          </>
        }
      />
    )
  }

  return { 
    createStandardFooter, 
    createDangerFooter, 
    createSimpleFooter 
  }
}
