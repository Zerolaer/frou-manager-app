import React, { useMemo } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ChevronRight, Home, Wallet, ListTodo, StickyNote, Goal, ArrowLeft } from 'lucide-react'
import { AccessibleButton } from './AccessibleComponents'
import { ARIA_LABELS } from '@/lib/accessibility'

// Breadcrumb item interface
interface BreadcrumbItem {
  label: string
  path: string
  icon?: React.ComponentType<any>
  isCurrent?: boolean
}

// Navigation configuration
const NAVIGATION_CONFIG = {
  '/': { label: 'Главная', icon: Home },
  '/finance': { label: 'Финансы', icon: Wallet },
  '/tasks': { label: 'Задачи', icon: ListTodo },
  '/notes': { label: 'Заметки', icon: StickyNote },
  '/goals': { label: 'Цели', icon: Goal }
} as const

// Breadcrumb component
export const Breadcrumbs: React.FC<{
  items?: BreadcrumbItem[]
  className?: string
}> = ({ items, className = '' }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const breadcrumbItems = useMemo(() => {
    if (items) return items

    const pathSegments = location.pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []

    // Always start with home
    breadcrumbs.push({
      label: 'Главная',
      path: '/',
      icon: Home
    })

    // Build breadcrumbs from path segments
    let currentPath = ''
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const isLast = index === pathSegments.length - 1
      
      // Get config for current path
      const config = NAVIGATION_CONFIG[currentPath as keyof typeof NAVIGATION_CONFIG]
      
      if (config) {
        breadcrumbs.push({
          label: config.label,
          path: currentPath,
          icon: config.icon,
          isCurrent: isLast
        })
      }
    })

    return breadcrumbs
  }, [location.pathname, items])

  if (breadcrumbItems.length <= 1) return null

  return (
    <nav 
      aria-label="Навигационная цепочка"
      className={`flex items-center space-x-2 text-sm ${className}`}
    >
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1
        const Icon = item.icon

        return (
          <React.Fragment key={item.path}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
            )}
            
            {isLast ? (
              <span 
                className="text-gray-900 font-medium flex items-center gap-1"
                aria-current="page"
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                aria-label={`Перейти к ${item.label}`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

// Back button component
export const BackButton: React.FC<{
  onClick?: () => void
  fallbackPath?: string
  className?: string
  children?: React.ReactNode
}> = ({ onClick, fallbackPath = '/', className = '', children }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleBack = () => {
    if (onClick) {
      onClick()
    } else if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(fallbackPath)
    }
  }

  return (
    <AccessibleButton
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`flex items-center gap-2 ${className}`}
      ariaLabel={ARIA_LABELS.PREVIOUS}
    >
      <ArrowLeft className="h-4 w-4" />
      {children || 'Назад'}
    </AccessibleButton>
  )
}

// Page header with breadcrumbs and actions
export const PageHeader: React.FC<{
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  showBackButton?: boolean
  onBack?: () => void
  className?: string
}> = ({ 
  title, 
  subtitle, 
  breadcrumbs, 
  actions, 
  showBackButton = false,
  onBack,
  className = '' 
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {showBackButton && (
            <div className="mb-2">
              <BackButton onClick={onBack} />
            </div>
          )}
          
          <Breadcrumbs items={breadcrumbs} className="mb-2" />
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-600">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {actions && (
          <div className="flex items-center gap-3 ml-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

// Tab navigation component
export const TabNavigation: React.FC<{
  tabs: Array<{
    id: string
    label: string
    icon?: React.ComponentType<any>
    count?: number
    disabled?: boolean
  }>
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}> = ({ tabs, activeTab, onTabChange, className = '' }) => {
  return (
    <nav 
      className={`flex space-x-8 border-b border-gray-200 ${className}`}
      aria-label="Вкладки"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={`
              flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap
              transition-colors duration-200
              ${isActive 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
              ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            aria-current={isActive ? 'page' : undefined}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`
                ml-1 px-2 py-0.5 text-xs rounded-full
                ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
              `}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

// Side navigation component
export const SideNavigation: React.FC<{
  items: Array<{
    id: string
    label: string
    icon?: React.ComponentType<any>
    path?: string
    count?: number
    badge?: string
    children?: Array<{
      id: string
      label: string
      path: string
      count?: number
    }>
  }>
  activeItem?: string
  onItemClick?: (itemId: string, path?: string) => void
  className?: string
}> = ({ items, activeItem, onItemClick, className = '' }) => {
  const location = useLocation()

  const handleItemClick = (item: typeof items[0]) => {
    onItemClick?.(item.id, item.path)
  }

  return (
    <nav className={`space-y-1 ${className}`}>
      {items.map((item) => {
        const Icon = item.icon
        const isActive = activeItem === item.id || location.pathname === item.path

        return (
          <div key={item.id}>
            <button
              onClick={() => handleItemClick(item)}
              className={`
                w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg
                transition-colors duration-200
                ${isActive 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </div>
              
              <div className="flex items-center gap-2">
                {item.count !== undefined && (
                  <span className={`
                    px-2 py-0.5 text-xs rounded-full
                    ${isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'}
                  `}>
                    {item.count}
                  </span>
                )}
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
            
            {/* Sub-items */}
            {item.children && isActive && (
              <div className="ml-6 mt-1 space-y-1">
                {item.children.map((child) => (
                  <Link
                    key={child.id}
                    to={child.path}
                    className={`
                      flex items-center justify-between px-3 py-2 text-sm rounded-lg
                      transition-colors duration-200
                      ${location.pathname === child.path
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }
                    `}
                  >
                    {child.label}
                    {child.count !== undefined && (
                      <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                        {child.count}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

// Quick actions component
export const QuickActions: React.FC<{
  actions: Array<{
    id: string
    label: string
    icon?: React.ComponentType<any>
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'danger'
    disabled?: boolean
  }>
  className?: string
}> = ({ actions, className = '' }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {actions.map((action) => {
        const Icon = action.icon

        return (
          <AccessibleButton
            key={action.id}
            variant={action.variant || 'secondary'}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled}
            className="flex items-center gap-2"
            ariaLabel={action.label}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {action.label}
          </AccessibleButton>
        )
      })}
    </div>
  )
}

// Search navigation component
export const SearchNavigation: React.FC<{
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onSearch?: (query: string) => void
  suggestions?: Array<{
    id: string
    label: string
    description?: string
    icon?: React.ComponentType<any>
  }>
  className?: string
}> = ({ 
  placeholder = 'Поиск...', 
  value, 
  onChange, 
  onSearch,
  suggestions = [],
  className = '' 
}) => {
  const [showSuggestions, setShowSuggestions] = React.useState(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch?.(value)
      setShowSuggestions(false)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => {
            const Icon = suggestion.icon
            
            return (
              <button
                key={suggestion.id}
                onClick={() => {
                  onChange(suggestion.label)
                  onSearch?.(suggestion.label)
                  setShowSuggestions(false)
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  {Icon && <Icon className="h-4 w-4 text-gray-400" />}
                  <div>
                    <div className="font-medium text-gray-900">
                      {suggestion.label}
                    </div>
                    {suggestion.description && (
                      <div className="text-sm text-gray-500">
                        {suggestion.description}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

