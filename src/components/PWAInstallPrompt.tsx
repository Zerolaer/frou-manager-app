import { logger } from '@/lib/monitoring'
import { useState, useEffect } from 'react'
import type { DependencyList } from 'react'
import { X, Download } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { useModal } from '@/hooks/useModal'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWA Install Prompt Component
 * Shows smart banner to install app as PWA
 */
export default function PWAInstallPrompt() {
  const { t } = useSafeTranslation()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  
  const bannerModal = useModal({
    closeOnEscape: false,
    closeOnOverlay: false,
    preventBodyScroll: false
  })

  useEffect(() => {
    const isDismissed = localStorage.getItem('pwa_install_dismissed')
    if (isDismissed) {
      setDismissed(true)
      return
    }

    let timerId: number | null = null

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      if (import.meta.env.DEV) {
        console.log('[pwa] install prompt available')
      }
      timerId = window.setTimeout(() => {
        if (!dismissed) {
          bannerModal.open()
        }
      }, 10000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      if (timerId !== null) window.clearTimeout(timerId)
    }
  }, [dismissed, bannerModal])

  const handleInstall = async () => {
    if (!installPrompt) return

    try {
      // Show native install prompt
      await installPrompt.prompt()

      // Wait for user choice
      const { outcome } = await installPrompt.userChoice

      if (outcome === 'accepted') {
        logger.debug('PWA install accepted')
      } else {
        logger.debug('PWA install dismissed')
      }
    } catch (error) {
      logger.error('PWA install failed:', error)
    }

    // Hide banner
    bannerModal.close()
    setInstallPrompt(null)
  }

  const handleDismiss = () => {
    bannerModal.close()
    setDismissed(true)
    localStorage.setItem('pwa_install_dismissed', 'true')
  }

  return (
    <>

      {/* Install Banner */}
      {!dismissed && bannerModal.isOpen && installPrompt && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 animate-slide-up">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="bg-blue-100 rounded-full p-2">
                <Download className="w-5 h-5 text-blue-600" />
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {t('pwa.installTitle')}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {t('pwa.installDescription')}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={handleInstall}
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    {t('pwa.install')}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    {t('common.later')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

