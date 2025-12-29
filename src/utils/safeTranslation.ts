import { useContext as useContextHook } from 'react'
import { I18nContext } from 'react-i18next'

const fallbackTranslator = {
  t: (key: string, _opts?: any) => key,
  ready: true,
  i18n: null as any
}

// Safe translation hook that handles missing provider / not-ready i18n
// Works around issues in Cursor's embedded browser where React might be null
export function useSafeTranslation() {
  // Safely read context - handle case when I18nContext is null or provider is missing
  let ctx = null
  
  // Try to use useContext, but handle the case where React might be null
  // This can happen in lazy-loaded chunks or in Cursor's embedded browser
  // which handles module loading differently than Chrome
  try {
    // Check if React is available by checking if useContext is a function
    // In Cursor browser, React might be null, causing useContext to fail
    if (typeof useContextHook === 'function' && I18nContext) {
      // Wrap in try-catch to handle cases where React internals are null
      try {
        ctx = useContextHook(I18nContext)
      } catch (hookError) {
        // React internals are null (common in Cursor browser)
        // Use fallback translator
        ctx = null
      }
    }
  } catch (error) {
    // If anything fails (e.g., React is null), use fallback
    // This is expected in Cursor's embedded browser
    ctx = null
  }
  
  // Use fallback if context is null or undefined
  const safeCtx = ctx || fallbackTranslator
  
  const tFn =
    safeCtx?.t ||
    (safeCtx?.i18n?.t ? safeCtx.i18n.t.bind(safeCtx.i18n) : fallbackTranslator.t)
  const readyFlag =
    typeof safeCtx?.ready === 'boolean'
      ? safeCtx.ready
      : safeCtx?.i18n?.isInitialized !== false
  
  const safeT = (key: string, options?: any): string => {
    if (!readyFlag) {
      return key // Return key if i18n not ready
    }
    
    try {
      const result = tFn(key, options)
      // If result is an object or undefined, return the key
      if (typeof result !== 'string') {
        // If result is an object, try to convert it to string
        if (result && typeof result === 'object') {
          try {
            return String(result)
          } catch {
            return key
          }
        }
        return key
      }
      return result
    } catch (error) {
      console.warn(`Translation error for key "${key}":`, String(error))
      return key
    }
  }
  
  return { t: safeT, ready: readyFlag, i18n: safeCtx?.i18n }
}

// Utility function for safe translation outside of React components
export function safeTranslate(t: any, key: string, options?: any): string {
  try {
    const result = t(key, options)
    if (typeof result !== 'string') {
      return key
    }
    return result
  } catch (error) {
    console.warn(`Translation error for key "${key}":`, String(error))
    return key
  }
}
