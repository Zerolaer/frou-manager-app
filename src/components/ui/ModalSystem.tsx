import React from 'react'
import Modal from './Modal'
import SideModal from './SideModal'

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
  // Используем корпоративные .btn классы
  const variantClasses = {
    primary: 'btn btn-primary',
    secondary: 'btn btn-outline',
    danger: 'btn btn-danger',
    ghost: 'btn'
  }
  
  const sizeClasses = {
    sm: 'btn-xs',
    md: '',
    lg: 'btn-lg'
  }
  
  const classes = [
    variantClasses[variant],
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ')

  return (
    <button
      className={`${classes} relative`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
        </div>
      )}
      <span className={loading ? 'invisible' : ''}>
        {children}
      </span>
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
        <div className="text-lg font-semibold text-gray-900 leading-none m-0">{title}</div>
        {subtitle && <p className="mt-1 text-sm text-gray-500 leading-none">{subtitle}</p>}
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
  contentClassName?: string
  variant?: 'center' | 'side' // Новый параметр для выбора типа модалки
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
  bodyClassName,
  contentClassName,
  variant = 'center'
}: UnifiedModalProps) {
  // Для side-модалок используем SideModal
  if (variant === 'side') {
    return (
      <SideModal
        open={open}
        onClose={onClose}
        title={subtitle ? (
          <div>
            <div className="text-lg font-semibold text-gray-900 leading-none m-0">{title}</div>
            <div className="text-sm text-gray-500 mt-1 leading-none">{subtitle}</div>
          </div>
        ) : title}
        footer={footer}
      >
        {children}
      </SideModal>
    )
  }

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
      title={title}
      subTitle={subtitle}
      headerRight={headerRight}
      footer={footer}
      size={sizeMap[size]}
      closeOnOverlay={closeOnOverlay}
      bodyClassName={bodyClassName}
      contentClassName={contentClassName}
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
