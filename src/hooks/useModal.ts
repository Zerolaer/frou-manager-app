import { useState, useCallback, useRef, useEffect } from 'react'
import { logger } from '@/lib/monitoring'

export interface ModalState {
  isOpen: boolean
  isAnimating: boolean
}

export interface ModalActions {
  open: () => void
  close: () => void
  toggle: () => void
  setOpen: (open: boolean) => void
}

export interface UseModalOptions {
  /** Whether modal should close on escape key */
  closeOnEscape?: boolean
  /** Whether modal should close when clicking outside */
  closeOnOverlay?: boolean
  /** Whether to restore focus when closing */
  restoreFocus?: boolean
  /** Whether to prevent body scroll when open */
  preventBodyScroll?: boolean
  /** Callback when modal opens */
  onOpen?: () => void
  /** Callback when modal closes */
  onClose?: () => void
  /** Initial open state */
  initialOpen?: boolean
}

/**
 * Universal modal management hook
 * 
 * Usage:
 * ```tsx
 * const modal = useModal({
 *   closeOnEscape: true,
 *   closeOnOverlay: true,
 *   onOpen: () => console.log('Modal opened'),
 *   onClose: () => console.log('Modal closed')
 * })
 * 
 * return (
 *   <>
 *     <button onClick={modal.open}>Open Modal</button>
 *     <Modal open={modal.isOpen} onClose={modal.close}>
 *       Content
 *     </Modal>
 *   </>
 * )
 * ```
 */
export function useModal(options: UseModalOptions = {}): ModalState & ModalActions {
  const {
    closeOnEscape = true,
    closeOnOverlay = true,
    restoreFocus = true,
    preventBodyScroll = true,
    onOpen,
    onClose,
    initialOpen = false
  } = options

  const [isOpen, setIsOpen] = useState(initialOpen)
  const [isAnimating, setIsAnimating] = useState(false)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape])

  // Handle body scroll
  useEffect(() => {
    if (!preventBodyScroll) return

    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, preventBodyScroll])

  // Focus management
  useEffect(() => {
    if (!isOpen) return

    // Save current focus
    previousFocusRef.current = document.activeElement as HTMLElement

    return () => {
      // Restore focus when closing
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus()
      }
    }
  }, [isOpen, restoreFocus])

  const open = useCallback(() => {
    setIsOpen(true)
    setIsAnimating(true)
    
    // Small delay for animation
    setTimeout(() => setIsAnimating(false), 10)
    
    onOpen?.()
    logger.debug('Modal opened')
  }, [onOpen])

  const close = useCallback(() => {
    setIsAnimating(true)
    
    // Delay for closing animation
    setTimeout(() => {
      setIsOpen(false)
      setIsAnimating(false)
      onClose?.()
      logger.debug('Modal closed')
    }, 200)
  }, [onClose])

  const toggle = useCallback(() => {
    if (isOpen) {
      close()
    } else {
      open()
    }
  }, [isOpen, open, close])

  const setOpen = useCallback((open: boolean) => {
    if (open) {
      open()
    } else {
      close()
    }
  }, [open, close])

  return {
    isOpen,
    isAnimating,
    open,
    close,
    toggle,
    setOpen
  }
}

/**
 * Hook for managing multiple modals
 */
export function useModals<T extends string>(
  modalNames: T[],
  options: UseModalOptions = {}
): Record<T, ModalState & ModalActions> {
  const modals = {} as Record<T, ModalState & ModalActions>

  for (const name of modalNames) {
    modals[name] = useModal({
      ...options,
      onOpen: () => {
        options.onOpen?.()
        logger.debug(`Modal ${name} opened`)
      },
      onClose: () => {
        options.onClose?.()
        logger.debug(`Modal ${name} closed`)
      }
    })
  }

  return modals
}

/**
 * Hook for modal with form integration
 */
export function useModalWithForm<T extends Record<string, any>>(
  formOptions: Parameters<typeof useForm<T>>[0],
  modalOptions: UseModalOptions = {}
) {
  const modal = useModal(modalOptions)
  const form = useForm(formOptions)

  const openWithData = useCallback((data?: Partial<T>) => {
    if (data) {
      // Set form values
      for (const key in data) {
        form.setField(key, data[key]!)
      }
    }
    modal.open()
  }, [form, modal])

  const closeAndReset = useCallback(() => {
    form.reset()
    modal.close()
  }, [form, modal])

  return {
    ...modal,
    ...form,
    openWithData,
    closeAndReset
  }
}
