import { useEffect, useCallback, useRef } from 'react'
import { KEYBOARD_KEYS } from '@/lib/accessibility'

// Hook for global keyboard shortcuts
export function useGlobalKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in input/textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return
      }

      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="Поиск"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }

      // Escape to close modals
      if (e.key === KEYBOARD_KEYS.ESCAPE) {
        const modal = document.querySelector('[role="dialog"]') as HTMLElement
        if (modal) {
          const closeButton = modal.querySelector('button[aria-label*="Закрыть"], button[aria-label*="Отмена"]') as HTMLButtonElement
          if (closeButton) {
            closeButton.click()
          }
        }
      }

      // Alt + number for navigation
      if (e.altKey && /^[1-5]$/.test(e.key)) {
        e.preventDefault()
        const navItems = document.querySelectorAll('#main-navigation a[href]')
        const index = parseInt(e.key) - 1
        if (navItems[index]) {
          (navItems[index] as HTMLAnchorElement).click()
        }
      }

      // Alt + H for home
      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        const homeLink = document.querySelector('#main-navigation a[href="/"]') as HTMLAnchorElement
        if (homeLink) {
          homeLink.click()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}

// Hook for arrow key navigation in lists
export function useArrowKeyNavigation(
  items: any[],
  onSelect: (item: any, index: number) => void,
  options: {
    enabled?: boolean
    loop?: boolean
    orientation?: 'horizontal' | 'vertical'
  } = {}
) {
  const { enabled = true, loop = true, orientation = 'vertical' } = options
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!enabled || items.length === 0) return

    const isVertical = orientation === 'vertical'
    const isHorizontal = orientation === 'horizontal'

    switch (e.key) {
      case isVertical ? KEYBOARD_KEYS.ARROW_DOWN : KEYBOARD_KEYS.ARROW_RIGHT:
        e.preventDefault()
        setFocusedIndex(prev => {
          const next = prev + 1
          return next >= items.length ? (loop ? 0 : prev) : next
        })
        break

      case isVertical ? KEYBOARD_KEYS.ARROW_UP : KEYBOARD_KEYS.ARROW_LEFT:
        e.preventDefault()
        setFocusedIndex(prev => {
          const next = prev - 1
          return next < 0 ? (loop ? items.length - 1 : prev) : next
        })
        break

      case KEYBOARD_KEYS.ENTER:
      case KEYBOARD_KEYS.SPACE:
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          onSelect(items[focusedIndex], focusedIndex)
        }
        break

      case KEYBOARD_KEYS.HOME:
        e.preventDefault()
        setFocusedIndex(0)
        break

      case KEYBOARD_KEYS.END:
        e.preventDefault()
        setFocusedIndex(items.length - 1)
        break
    }
  }, [enabled, items.length, onSelect, loop, orientation, focusedIndex])

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown
  }
}

// Hook for focus management
export function useFocusManagement() {
  const focusHistory = useRef<HTMLElement[]>([])

  const saveFocus = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement
    if (activeElement) {
      focusHistory.current.push(activeElement)
    }
  }, [])

  const restoreFocus = useCallback(() => {
    if (focusHistory.current.length > 0) {
      const element = focusHistory.current.pop()
      if (element && element.focus) {
        element.focus()
      }
    }
  }, [])

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(`
      a[href],
      button:not([disabled]),
      input:not([disabled]),
      select:not([disabled]),
      textarea:not([disabled]),
      [tabindex]:not([tabindex="-1"]),
      [contenteditable="true"]
    `) as NodeListOf<HTMLElement>

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === KEYBOARD_KEYS.TAB) {
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
    
    // Focus first element
    firstElement.focus()

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return {
    saveFocus,
    restoreFocus,
    trapFocus
  }
}

// Hook for skip links
export function useSkipLinks() {
  const skipLinks = useRef<Map<string, HTMLElement>>(new Map())

  const registerSkipTarget = useCallback((id: string, element: HTMLElement) => {
    skipLinks.current.set(id, element)
  }, [])

  const unregisterSkipTarget = useCallback((id: string) => {
    skipLinks.current.delete(id)
  }, [])

  const focusSkipTarget = useCallback((id: string) => {
    const element = skipLinks.current.get(id)
    if (element) {
      element.focus()
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return {
    registerSkipTarget,
    unregisterSkipTarget,
    focusSkipTarget
  }
}

// Hook for accessible announcements
export function useAnnouncements() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Use the announcement function from accessibility utils
    const { announceToScreenReader } = require('@/lib/accessibility')
    announceToScreenReader(message, priority)
  }, [])

  return { announce }
}

// Import React hooks
import { useState } from 'react'
