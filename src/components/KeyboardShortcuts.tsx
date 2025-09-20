import React, { useState, useEffect } from 'react'
import { useGlobalKeyboardShortcuts } from '@/hooks/useKeyboardNavigation'

interface KeyboardShortcutsProps {
  show?: boolean
  onToggle?: () => void
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  show = false,
  onToggle
}) => {
  const [isVisible, setIsVisible] = useState(show)

  useGlobalKeyboardShortcuts()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + ? to toggle shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '?') {
        e.preventDefault()
        setIsVisible(prev => !prev)
        onToggle?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onToggle])

  if (!isVisible) return null

  const shortcuts = [
    {
      keys: ['Ctrl', 'K'],
      description: 'Фокус на поиск',
      category: 'Навигация'
    },
    {
      keys: ['Alt', '1'],
      description: 'Главная',
      category: 'Навигация'
    },
    {
      keys: ['Alt', '2'],
      description: 'Финансы',
      category: 'Навигация'
    },
    {
      keys: ['Alt', '3'],
      description: 'Задачи',
      category: 'Навигация'
    },
    {
      keys: ['Alt', '4'],
      description: 'Заметки',
      category: 'Навигация'
    },
    {
      keys: ['Alt', '5'],
      description: 'Цели',
      category: 'Навигация'
    },
    {
      keys: ['Alt', 'H'],
      description: 'Главная страница',
      category: 'Навигация'
    },
    {
      keys: ['Escape'],
      description: 'Закрыть модальное окно',
      category: 'Общие'
    },
    {
      keys: ['Tab'],
      description: 'Переход к следующему элементу',
      category: 'Навигация'
    },
    {
      keys: ['Shift', 'Tab'],
      description: 'Переход к предыдущему элементу',
      category: 'Навигация'
    },
    {
      keys: ['Enter'],
      description: 'Активировать элемент',
      category: 'Общие'
    },
    {
      keys: ['Space'],
      description: 'Активировать кнопку',
      category: 'Общие'
    }
  ]

  const categories = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, typeof shortcuts>)

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={() => setIsVisible(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 id="shortcuts-title" className="text-xl font-semibold">
            Клавиатурные сокращения
          </h2>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 text-xl"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {Object.entries(categories).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <span className="text-gray-700">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            {keyIndex > 0 && (
                              <span className="text-gray-400 mx-1">+</span>
                            )}
                            <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded">
                              {key}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-600">
              <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded">
                Ctrl
              </kbd>
              <span className="mx-1">+</span>
              <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded">
                ?
              </kbd>
              <span className="ml-2">для показа/скрытия этого окна</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook to show keyboard shortcuts
export function useKeyboardShortcuts() {
  const [showShortcuts, setShowShortcuts] = useState(false)

  const toggleShortcuts = () => {
    setShowShortcuts(prev => !prev)
  }

  const KeyboardShortcutsComponent = () => (
    <KeyboardShortcuts 
      show={showShortcuts} 
      onToggle={() => setShowShortcuts(false)} 
    />
  )

  return {
    showShortcuts,
    toggleShortcuts,
    KeyboardShortcutsComponent
  }
}
