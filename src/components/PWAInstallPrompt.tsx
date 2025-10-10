import { logger } from '@/lib/monitoring'
import React, { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWA Install Prompt Component
 * Shows smart banner to install app as PWA
 */
export default function PWAInstallPrompt() {
  const { t } = useTranslation()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already dismissed
    const isDismissed = localStorage.getItem('pwa_install_dismissed')
    if (isDismissed) {
      setDismissed(true)
      return
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      
      // Show banner after 30 seconds of usage
      setTimeout(() => {
        setShowBanner(true)
      }, 30000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return

    // Show native install prompt
    await installPrompt.prompt()

    // Wait for user choice
    const { outcome } = await installPrompt.userChoice

    if (outcome === 'accepted') {
      logger.debug('✅ User accepted PWA install')
    } else {
      logger.debug('❌ User dismissed PWA install')
    }

    // Hide banner
    setShowBanner(false)
    setInstallPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setDismissed(true)
    localStorage.setItem('pwa_install_dismissed', 'true')
  }

  // Don't show if dismissed or no prompt available
  if (dismissed || !showBanner || !installPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4">
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
              {t('pwa.installTitle') || 'Установить приложение'}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {t('pwa.installDescription') || 'Быстрый доступ с главного экрана, работает оффлайн'}
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {t('pwa.install') || 'Установить'}
              </button>
              <button
                onClick={handleDismiss}
                className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                {t('common.later') || 'Позже'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

