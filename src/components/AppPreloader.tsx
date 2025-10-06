import React, { useEffect, useState } from 'react'
import '../preloader.css'

interface AppPreloaderProps {
  onComplete: () => void
}

const AppPreloader: React.FC<AppPreloaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [loadingText, setLoadingText] = useState('Загрузка приложения...')

  useEffect(() => {
    // Меняем текст загрузки
    const textInterval = setInterval(() => {
      setLoadingText(prev => {
        const texts = [
          'Загрузка приложения...',
          'Инициализация компонентов...',
          'Подготовка интерфейса...',
          'Завершение загрузки...'
        ]
        const currentIndex = texts.indexOf(prev)
        return texts[(currentIndex + 1) % texts.length]
      })
    }, 400)

    // Симуляция загрузки с плавным прогрессом
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          clearInterval(textInterval)
          // Небольшая задержка перед завершением
          setTimeout(() => {
            setIsVisible(false)
            setTimeout(onComplete, 300) // Время для анимации исчезновения
          }, 300)
          return 100
        }
        // Более реалистичный прогресс
        if (prev < 30) return prev + Math.random() * 8 + 3
        if (prev < 70) return prev + Math.random() * 5 + 2
        if (prev < 90) return prev + Math.random() * 3 + 1
        return prev + Math.random() * 2 + 0.5 // Медленнее в конце
      })
    }, 80)

    return () => {
      clearInterval(interval)
      clearInterval(textInterval)
    }
  }, [onComplete])

  if (!isVisible) {
    return null
  }

  return (
    <div className={`preloader-container ${!isVisible ? 'fade-out' : ''}`}>
      <div className="preloader-content">
        {/* Логотип/Иконка */}
        <div className="preloader-logo">
          <div className="preloader-logo-bg"></div>
          <div className="preloader-logo-inner">
            <div className="preloader-logo-spinner"></div>
          </div>
        </div>
        
        <h1 className="preloader-title">Frou Manager</h1>
        <p className="preloader-subtitle">{loadingText}</p>

        {/* Прогресс бар */}
        <div className="preloader-progress-container">
          <div className="preloader-progress-bar">
            <div 
              className="preloader-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Процент */}
          <div className="preloader-percentage">
            {Math.round(progress)}%
          </div>
        </div>

        {/* Анимированные точки */}
        <div className="preloader-dots">
          <div className="preloader-dot"></div>
          <div className="preloader-dot"></div>
          <div className="preloader-dot"></div>
        </div>
      </div>
    </div>
  )
}

export default AppPreloader
