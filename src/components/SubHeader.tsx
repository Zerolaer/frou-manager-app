import React from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Filter, Search, Download, Upload, Settings, Calendar, Target, FileText, CheckSquare } from 'lucide-react'
import YearSelector from './YearSelector'

interface SubHeaderProps {
  onAction?: (action: string) => void
  currentYear?: number
  onYearChange?: (year: number) => void
}

export default function SubHeader({ onAction, currentYear, onYearChange }: SubHeaderProps) {
  const location = useLocation()
  const pathname = location.pathname

  const getSubHeaderContent = () => {
    switch (pathname) {
      case '/':
        return {
          title: 'Обзор',
          actions: [
            { id: 'refresh', label: 'Обновить', icon: Download, variant: 'secondary' },
            { id: 'settings', label: 'Настройки', icon: Settings, variant: 'secondary' }
          ]
        }

      case '/finance':
        return {
          title: 'Финансы',
          actions: [
            { id: 'add-category', label: 'Добавить категорию', icon: Plus, variant: 'primary' },
            { id: 'annual-stats', label: 'Годовая статистика', icon: Target, variant: 'secondary' },
            { id: 'export', label: 'Экспорт', icon: Download, variant: 'secondary' },
            { id: 'import', label: 'Импорт', icon: Upload, variant: 'secondary' }
          ]
        }

      case '/tasks':
        return {
          title: 'Задачи',
          actions: [
            { id: 'add-task', label: 'Новая задача', icon: Plus, variant: 'primary' },
            { id: 'filter', label: 'Фильтр', icon: Filter, variant: 'secondary' },
            { id: 'calendar', label: 'Календарь', icon: Calendar, variant: 'secondary' },
            { id: 'search', label: 'Поиск', icon: Search, variant: 'secondary' }
          ]
        }

      case '/goals':
        return {
          title: 'Цели',
          actions: [
            { id: 'add-goal', label: 'Новая цель', icon: Plus, variant: 'primary' },
            { id: 'filter', label: 'Фильтр', icon: Filter, variant: 'secondary' },
            { id: 'progress', label: 'Прогресс', icon: Target, variant: 'secondary' }
          ]
        }

      case '/notes':
        return {
          title: 'Заметки',
          actions: [
            { id: 'add-note', label: 'Новая заметка', icon: Plus, variant: 'primary' },
            { id: 'search', label: 'Поиск', icon: Search, variant: 'secondary' },
            { id: 'filter', label: 'Фильтр', icon: Filter, variant: 'secondary' },
            { id: 'export', label: 'Экспорт', icon: Download, variant: 'secondary' }
          ]
        }

      default:
        return null
    }
  }

  const content = getSubHeaderContent()

  if (!content) return null

  const handleAction = (actionId: string) => {
    if (onAction) {
      onAction(actionId)
    }
  }

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-h2 text-gray-900 leading-none !mb-0">{content.title}</h2>
        
        <div className="flex items-center gap-2 h-8">
          {/* Year selector for Finance page */}
          {pathname === '/finance' && currentYear && onYearChange && (
            <YearSelector currentYear={currentYear} onYearChange={onYearChange} />
          )}
          
          {content.actions.map((action) => {
            const Icon = action.icon
            const isPrimary = action.variant === 'primary'
            
            return (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-button transition-all duration-200 ${
                  isPrimary
                    ? 'bg-gradient-to-br from-gray-800 to-gray-600 text-white hover:from-gray-900 hover:to-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
                }`}
                aria-label={action.label}
              >
                <Icon className="w-4 h-4" />
                {action.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
