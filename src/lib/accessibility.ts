// Accessibility utilities and helpers

export const ARIA_LABELS = {
  // Navigation
  MAIN_NAVIGATION: 'Основная навигация',
  BREADCRUMB: 'Навигационная цепочка',
  SIDEBAR: 'Боковая панель',
  
  // Actions
  ADD: 'Добавить',
  EDIT: 'Редактировать',
  DELETE: 'Удалить',
  SAVE: 'Сохранить',
  CANCEL: 'Отмена',
  CLOSE: 'Закрыть',
  EXPAND: 'Развернуть',
  COLLAPSE: 'Свернуть',
  
  // Content
  LOADING: 'Загрузка',
  SEARCH: 'Поиск',
  FILTER: 'Фильтр',
  SORT: 'Сортировка',
  PREVIOUS: 'Предыдущий',
  NEXT: 'Следующий',
  
  // Status
  SUCCESS: 'Успешно',
  ERROR: 'Ошибка',
  WARNING: 'Предупреждение',
  INFO: 'Информация'
} as const

export const ARIA_ROLES = {
  BUTTON: 'button',
  LINK: 'link',
  MENU: 'menu',
  MENUITEM: 'menuitem',
  DIALOG: 'dialog',
  ALERT: 'alert',
  STATUS: 'status',
  PROGRESSBAR: 'progressbar',
  TAB: 'tab',
  TABPANEL: 'tabpanel',
  TABLIST: 'tablist',
  LIST: 'list',
  LISTITEM: 'listitem',
  GRID: 'grid',
  GRIDCELL: 'gridcell',
  HEADING: 'heading',
  REGION: 'region',
  LANDMARK: 'landmark'
} as const

// Generate unique IDs for ARIA relationships
let idCounter = 0
export function generateId(prefix = 'id'): string {
  return `${prefix}-${++idCounter}`
}

// ARIA live region for announcements
export function createLiveRegion(): HTMLElement {
  const existing = document.getElementById('aria-live-region')
  if (existing) return existing

  const liveRegion = document.createElement('div')
  liveRegion.id = 'aria-live-region'
  liveRegion.setAttribute('aria-live', 'polite')
  liveRegion.setAttribute('aria-atomic', 'true')
  liveRegion.className = 'sr-only' // Screen reader only
  liveRegion.style.cssText = `
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `
  
  document.body.appendChild(liveRegion)
  return liveRegion
}

// Announce message to screen readers
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const liveRegion = createLiveRegion()
  liveRegion.setAttribute('aria-live', priority)
  liveRegion.textContent = message
  
  // Clear after announcement
  setTimeout(() => {
    liveRegion.textContent = ''
  }, 1000)
}

// Focus management utilities
export class FocusManager {
  private focusHistory: HTMLElement[] = []
  private currentFocus: HTMLElement | null = null

  saveFocus() {
    this.currentFocus = document.activeElement as HTMLElement
    if (this.currentFocus) {
      this.focusHistory.push(this.currentFocus)
    }
  }

  restoreFocus() {
    if (this.focusHistory.length > 0) {
      const element = this.focusHistory.pop()
      if (element && element.focus) {
        element.focus()
      }
    }
  }

  focusFirst(element: HTMLElement) {
    const focusableElements = this.getFocusableElements(element)
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }
  }

  focusLast(element: HTMLElement) {
    const focusableElements = this.getFocusableElements(element)
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus()
    }
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ')

    return Array.from(container.querySelectorAll(selector)) as HTMLElement[]
  }

  trapFocus(container: HTMLElement) {
    const focusableElements = this.getFocusableElements(container)
    
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }
}

// Keyboard navigation utilities
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown'
} as const

// Color contrast utilities
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    const rgb = hexToRgb(color)
    if (!rgb) return 0

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const luminance1 = getLuminance(color1)
  const luminance2 = getLuminance(color2)
  
  const lighter = Math.max(luminance1, luminance2)
  const darker = Math.min(luminance1, luminance2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

export function isAccessibleContrast(foreground: string, background: string): boolean {
  const ratio = getContrastRatio(foreground, background)
  return ratio >= 4.5 // WCAG AA standard
}

// Screen reader only text
export const srOnly = {
  className: 'sr-only',
  style: {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: '0'
  }
}

// Skip links for keyboard navigation
export function SkipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return React.createElement(
    'a',
    {
      href,
      className: "sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2 z-50",
      style: srOnly.style
    },
    children
  )
}

// Import React for JSX
import React from 'react'
