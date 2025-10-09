import React, { useState, useEffect } from 'react'
import { useToast } from '@/lib/toast'

export default function Toaster(){
  const { toasts, remove } = useToast()
  const [animatingToasts, setAnimatingToasts] = useState<Set<string>>(new Set())

  // Анимация появления - только для самого нового тоста
  useEffect(() => {
    if (toasts.length === 0) return
    
    // Находим самый новый тост (последний в массиве)
    const newestToast = toasts[toasts.length - 1]
    
    // Анимируем только если это новый тост, он не fading и не анимировался ранее
    if (!animatingToasts.has(newestToast.id) && !newestToast.fading) {
      setAnimatingToasts(prev => new Set(prev).add(newestToast.id))
      // Убираем класс анимации через 400ms
      setTimeout(() => {
        setAnimatingToasts(prev => {
          const newSet = new Set(prev)
          newSet.delete(newestToast.id)
          return newSet
        })
      }, 400)
    }
  }, [toasts.length, animatingToasts]) // Добавим animatingToasts в зависимости

  // CSS анимации для bounce эффекта
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('toast-bounce-animation')) {
      const style = document.createElement('style')
      style.id = 'toast-bounce-animation'
      style.textContent = `
        @keyframes toastBounce {
          0% {
            opacity: 0;
            transform: translateY(15px) scale(0.9);
          }
          60% {
            opacity: 1;
            transform: translateY(-2px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes toastSlideUp {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-100%);
          }
        }
        
        .toast-slide-up {
          animation: toastSlideUp 0.3s ease-out forwards;
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  return (
    <div className="fixed bottom-4 left-4 z-[60] space-y-4">
      {toasts.map((t) => {
        const isAnimating = animatingToasts.has(t.id)
        
        return (
          <div 
            key={t.id} 
            className={`rounded-2xl px-4 py-3 shadow-lg min-w-[260px] relative bg-black/80 backdrop-blur-sm border border-white/10 text-white/90 transition-all duration-300 ease-out ${
              t.fading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
            style={{
              borderRadius: '16px',
              animation: (isAnimating && !t.fading) ? 'toastBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
            }}
          >
            {t.title && <div className="text-sm font-semibold mb-0.5">{t.title}</div>}
            <div className="text-sm">{t.message}</div>
            <button
              className="absolute top-1 right-1 px-2 py-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
              onClick={() => remove(t.id)}
              aria-label="Close toast"
            >×</button>
          </div>
        )
      })}
    </div>
  )
}
