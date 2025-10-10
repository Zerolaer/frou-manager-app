import { logger } from '@/lib/monitoring'
import React from 'react'

// Theme system and dark mode utilities

export interface Theme {
  name: string
  displayName: string
  colors: {
    primary: string
    secondary: string
    background: string
    surface: string
    text: string
    textSecondary: string
    border: string
    success: string
    warning: string
    error: string
    info: string
  }
  dark: boolean
}

// Predefined themes
export const THEMES: Record<string, Theme> = {
  light: {
    name: 'light',
    displayName: 'Светлая',
    dark: false,
    colors: {
      primary: '#3b82f6',
      secondary: '#6b7280',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    }
  },
  dark: {
    name: 'dark',
    displayName: 'Темная',
    dark: true,
    colors: {
      primary: '#60a5fa',
      secondary: '#9ca3af',
      background: '#111827',
      surface: '#1f2937',
      text: '#f9fafb',
      textSecondary: '#d1d5db',
      border: '#374151',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa'
    }
  },
  blue: {
    name: 'blue',
    displayName: 'Синяя',
    dark: false,
    colors: {
      primary: '#1e40af',
      secondary: '#3b82f6',
      background: '#eff6ff',
      surface: '#dbeafe',
      text: '#1e3a8a',
      textSecondary: '#3730a3',
      border: '#93c5fd',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      info: '#0284c7'
    }
  },
  green: {
    name: 'green',
    displayName: 'Зеленая',
    dark: false,
    colors: {
      primary: '#059669',
      secondary: '#10b981',
      background: '#f0fdf4',
      surface: '#dcfce7',
      text: '#064e3b',
      textSecondary: '#065f46',
      border: '#86efac',
      success: '#16a34a',
      warning: '#ca8a04',
      error: '#dc2626',
      info: '#0891b2'
    }
  },
  purple: {
    name: 'purple',
    displayName: 'Фиолетовая',
    dark: false,
    colors: {
      primary: '#7c3aed',
      secondary: '#8b5cf6',
      background: '#faf5ff',
      surface: '#f3e8ff',
      text: '#581c87',
      textSecondary: '#6b21a8',
      border: '#c4b5fd',
      success: '#16a34a',
      warning: '#ca8a04',
      error: '#dc2626',
      info: '#0891b2'
    }
  },
  highContrast: {
    name: 'highContrast',
    displayName: 'Высокий контраст',
    dark: true,
    colors: {
      primary: '#ffffff',
      secondary: '#ffffff',
      background: '#000000',
      surface: '#1a1a1a',
      text: '#ffffff',
      textSecondary: '#cccccc',
      border: '#ffffff',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000',
      info: '#00ffff'
    }
  }
} as const

// Theme storage key
const THEME_STORAGE_KEY = 'app-theme'

// Theme manager class
class ThemeManager {
  private currentTheme: Theme = THEMES.light
  private listeners: Set<(theme: Theme) => void> = new Set()
  private systemPreference: 'light' | 'dark' = 'light'

  constructor() {
    this.initializeTheme()
    this.setupSystemPreferenceListener()
  }

  private initializeTheme() {
    // Check for saved theme preference
    const savedTheme = this.getStoredTheme()
    
    if (savedTheme && THEMES[savedTheme]) {
      this.currentTheme = THEMES[savedTheme]
    } else {
      // Check system preference
      this.systemPreference = this.getSystemPreference()
      this.currentTheme = THEMES[this.systemPreference]
    }

    this.applyTheme(this.currentTheme)
  }

  private getStoredTheme(): string | null {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY)
    } catch {
      return null
    }
  }

  private setStoredTheme(themeName: string) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeName)
    } catch {
      // Ignore storage errors
    }
  }

  private getSystemPreference(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light'
    
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  }

  private setupSystemPreferenceListener() {
    if (typeof window === 'undefined') return

    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', (e) => {
        this.systemPreference = e.matches ? 'dark' : 'light'
        
        // Only auto-switch if user hasn't manually set a theme
        const savedTheme = this.getStoredTheme()
        if (!savedTheme) {
          this.setTheme(THEMES[this.systemPreference])
        }
      })
    } catch {
      // Ignore if media query is not supported
    }
  }

  private applyTheme(theme: Theme) {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    
    // Apply CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value)
    })

    // Apply theme class
    root.classList.remove('theme-light', 'theme-dark', 'theme-blue', 'theme-green', 'theme-purple', 'theme-highContrast')
    root.classList.add(`theme-${theme.name}`)

    // Set data attribute for CSS selectors
    root.setAttribute('data-theme', theme.name)
    root.setAttribute('data-color-scheme', theme.dark ? 'dark' : 'light')

    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(theme.colors.primary)
  }

  private updateMetaThemeColor(color: string) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]')
    
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta')
      metaThemeColor.setAttribute('name', 'theme-color')
      document.head.appendChild(metaThemeColor)
    }
    
    metaThemeColor.setAttribute('content', color)
  }

  getCurrentTheme(): Theme {
    return this.currentTheme
  }

  setTheme(theme: Theme) {
    this.currentTheme = theme
    this.applyTheme(theme)
    this.setStoredTheme(theme.name)
    this.notifyListeners()
  }

  setThemeByName(themeName: string) {
    const theme = THEMES[themeName]
    if (theme) {
      this.setTheme(theme)
    }
  }

  toggleDarkMode() {
    const newTheme = this.currentTheme.dark ? THEMES.light : THEMES.dark
    this.setTheme(newTheme)
  }

  resetToSystem() {
    localStorage.removeItem(THEME_STORAGE_KEY)
    this.setTheme(THEMES[this.systemPreference])
  }

  subscribe(listener: (theme: Theme) => void): () => void {
    this.listeners.add(listener)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentTheme)
      } catch (error) {
        logger.error('Theme listener error:', error)
      }
    })
  }

  getAvailableThemes(): Theme[] {
    return Object.values(THEMES)
  }

  isDarkMode(): boolean {
    return this.currentTheme.dark
  }

}

// Global theme manager instance
export const themeManager = new ThemeManager()

// React hook for theme management
export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>(themeManager.getCurrentTheme())

  React.useEffect(() => {
    const unsubscribe = themeManager.subscribe(setTheme)
    return unsubscribe
  }, [])

  const setThemeByName = React.useCallback((themeName: string) => {
    themeManager.setThemeByName(themeName)
  }, [])

  const toggleDarkMode = React.useCallback(() => {
    themeManager.toggleDarkMode()
  }, [])

  const resetToSystem = React.useCallback(() => {
    themeManager.resetToSystem()
  }, [])

  const getAvailableThemes = React.useCallback(() => {
    return themeManager.getAvailableThemes()
  }, [])

  return {
    theme,
    setTheme: setThemeByName,
    toggleDarkMode,
    resetToSystem,
    getAvailableThemes,
    isDarkMode: theme.dark
  }
}

// Theme provider component
export const ThemeProvider: React.FC<{
  children: React.ReactNode
  defaultTheme?: string
}> = ({ children, defaultTheme }) => {
  React.useEffect(() => {
    if (defaultTheme && THEMES[defaultTheme]) {
      themeManager.setThemeByName(defaultTheme)
    }
  }, [defaultTheme])

  return <>{children}</>
}

// Theme selector component
export const ThemeSelector: React.FC<{
  className?: string
}> = ({ className = '' }) => {
  const { theme, setTheme, getAvailableThemes } = useTheme()
  const [isOpen, setIsOpen] = React.useState(false)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  const themes = getAvailableThemes()

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        aria-label="Выбрать тему"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-4 h-4 rounded-full border-2 border-current" />
        <span>{theme.displayName}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
        >
          {themes.map((themeOption) => (
            <button
              key={themeOption.name}
              onClick={() => {
                setTheme(themeOption.name)
                setIsOpen(false)
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-gray-100
                ${theme.name === themeOption.name ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
              `}
            >
              <div 
                className={`w-3 h-3 rounded-full border-2 ${
                  themeOption.dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
              {themeOption.displayName}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Dark mode toggle component
export const DarkModeToggle: React.FC<{
  className?: string
  showLabel?: boolean
}> = ({ className = '', showLabel = true }) => {
  const { isDarkMode, toggleDarkMode } = useTheme()

  return (
    <button
      onClick={toggleDarkMode}
      className={`flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors ${className}`}
      aria-label={isDarkMode ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
    >
      {isDarkMode ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
      {showLabel && (
        <span>{isDarkMode ? 'Светлая' : 'Темная'}</span>
      )}
    </button>
  )
}


