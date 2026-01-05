import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { AlertTriangle, Info } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'

interface ModalConfirmContextType {
  confirm: (message: string, title?: string) => Promise<boolean>
  alert: (message: string, title?: string) => Promise<void>
}

const ModalConfirmContext = createContext<ModalConfirmContextType | null>(null)

export function useModalConfirm() {
  const context = useContext(ModalConfirmContext)
  if (!context) {
    // Если контекст не доступен, это критическая ошибка
    // Вместо системного alert создаем временный модал через UnifiedModal
    console.error('ModalConfirmContext is not available. Make sure ModalConfirmProvider is wrapped around your app.')
    
    // Используем временный модал вместо системного alert
    const tempAlert = (message: string, title?: string): Promise<void> => {
      return new Promise((resolve) => {
        // Создаем временный модал элемент
        const modal = document.createElement('div')
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'
        modal.innerHTML = `
          <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 class="text-lg font-semibold mb-4">${title || 'Уведомление'}</h3>
            <p class="text-gray-700 mb-6">${message}</p>
            <button class="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
              OK
            </button>
          </div>
        `
        const button = modal.querySelector('button')
        const close = () => {
          document.body.removeChild(modal)
          resolve()
        }
        button?.addEventListener('click', close)
        modal.addEventListener('click', (e) => {
          if (e.target === modal) close()
        })
        document.body.appendChild(modal)
      })
    }
    
    return {
      confirm: (message: string) => {
        return tempAlert(message, 'Подтверждение').then(() => true)
      },
      alert: tempAlert
    }
  }
  return context
}

export function ModalConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useSafeTranslation()
  
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    message: string
    title: string
    resolve: ((value: boolean) => void) | null
  }>({
    open: false,
    message: '',
    title: t('common.confirm') || 'Confirm',
    resolve: null
  })

  const [alertState, setAlertState] = useState<{
    open: boolean
    message: string
    title: string
    resolve: (() => void) | null
  }>({
    open: false,
    message: '',
    title: t('common.notification') || 'Notification',
    resolve: null
  })

  const { createSimpleFooter } = useModalActions()

  const confirm = useCallback((message: string, title?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        open: true,
        message,
        title: title || t('common.confirm') || 'Confirm',
        resolve
      })
    })
  }, [t])

  const alert = useCallback((message: string, title?: string): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        open: true,
        message,
        title: title || t('common.notification') || 'Notification',
        resolve
      })
    })
  }, [t])

  const handleConfirm = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(true)
    }
    setConfirmState(prev => ({ ...prev, open: false, resolve: null }))
  }, [confirmState.resolve])

  const handleCancel = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(false)
    }
    setConfirmState(prev => ({ ...prev, open: false, resolve: null }))
  }, [confirmState.resolve])

  const handleAlertClose = useCallback(() => {
    if (alertState.resolve) {
      alertState.resolve()
    }
    setAlertState(prev => ({ ...prev, open: false, resolve: null }))
  }, [alertState.resolve])

  return (
    <ModalConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {createPortal(
        <UnifiedModal
          open={confirmState.open}
          onClose={handleCancel}
          title={confirmState.title}
          size="sm"
          footer={createSimpleFooter(
            {
              label: t('actions.cancel') || 'Cancel',
              onClick: handleCancel
            },
            {
              label: t('actions.confirm') || 'Confirm',
              onClick: handleConfirm
            }
          )}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700 whitespace-pre-line">
              {confirmState.message}
            </div>
          </div>
        </UnifiedModal>,
        document.body
      )}
      {createPortal(
        <UnifiedModal
          open={alertState.open}
          onClose={handleAlertClose}
          title={alertState.title}
          size="sm"
          footer={createSimpleFooter({
            label: t('common.ok') || 'OK',
            onClick: handleAlertClose
          })}
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700 whitespace-pre-line">
              {alertState.message}
            </div>
          </div>
        </UnifiedModal>,
        document.body
      )}
    </ModalConfirmContext.Provider>
  )
}
