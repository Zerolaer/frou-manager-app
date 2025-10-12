import { useTranslation } from 'react-i18next'

// Safe translation hook that handles i18n not being ready
export function useSafeTranslation() {
  const { t, ready, i18n } = useTranslation()
  
  const safeT = (key: string, options?: any): string => {
    if (!ready) {
      return key // Return key if i18n not ready
    }
    
    try {
      const result = t(key, options)
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
  
  return { t: safeT, ready, i18n }
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
