// Data validation and sanitization utilities

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => string | undefined
  sanitize?: (value: any) => any
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedValue?: any
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s\-_]+$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  russianText: /^[а-яА-ЯёЁ\s\-'\.]+$/,
  numbersOnly: /^\d+$/,
  decimal: /^\d+(\.\d{1,2})?$/
} as const

// Common sanitization functions
export const SANITIZATION_FUNCTIONS = {
  trim: (value: string) => value?.trim(),
  toLowerCase: (value: string) => value?.toLowerCase(),
  toUpperCase: (value: string) => value?.toUpperCase(),
  removeHtml: (value: string) => value?.replace(/<[^>]*>/g, ''),
  removeScripts: (value: string) => value?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
  escapeHtml: (value: string) => value?.replace(/[&<>"']/g, (match) => {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
    return escapeMap[match] || match
  }),
  normalizeWhitespace: (value: string) => value?.replace(/\s+/g, ' '),
  removeNonPrintable: (value: string) => value?.replace(/[\x00-\x1F\x7F]/g, ''),
  limitLength: (maxLength: number) => (value: string) => value?.substring(0, maxLength),
  parseNumber: (value: string) => {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? undefined : parsed
  },
  parseInteger: (value: string) => {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? undefined : parsed
  }
} as const

// Main validation function
export function validateField(value: any, rule: ValidationRule, fieldName: string = 'Поле'): ValidationResult {
  const errors: string[] = []
  let sanitizedValue = value

  // Sanitize value first if sanitize function is provided
  if (rule.sanitize && typeof value === 'string') {
    sanitizedValue = rule.sanitize(value)
  }

  // Required validation
  if (rule.required) {
    if (sanitizedValue === null || sanitizedValue === undefined || sanitizedValue === '') {
      errors.push(`${fieldName} обязательно для заполнения`)
    }
  }

  // Skip other validations if value is empty and not required
  if ((sanitizedValue === null || sanitizedValue === undefined || sanitizedValue === '') && !rule.required) {
    return {
      isValid: true,
      errors: [],
      sanitizedValue
    }
  }

  // Type-specific validations
  if (typeof sanitizedValue === 'string') {
    // Length validations
    if (rule.minLength && sanitizedValue.length < rule.minLength) {
      errors.push(`${fieldName} должно содержать не менее ${rule.minLength} символов`)
    }
    if (rule.maxLength && sanitizedValue.length > rule.maxLength) {
      errors.push(`${fieldName} должно содержать не более ${rule.maxLength} символов`)
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(sanitizedValue)) {
      errors.push(`${fieldName} имеет неверный формат`)
    }
  }

  if (typeof sanitizedValue === 'number') {
    // Numeric validations
    if (rule.min !== undefined && sanitizedValue < rule.min) {
      errors.push(`${fieldName} должно быть не менее ${rule.min}`)
    }
    if (rule.max !== undefined && sanitizedValue > rule.max) {
      errors.push(`${fieldName} должно быть не более ${rule.max}`)
    }
  }

  // Custom validation
  if (rule.custom) {
    const customError = rule.custom(sanitizedValue)
    if (customError) {
      errors.push(customError)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue
  }
}

// Validate entire object against schema
export function validateObject(data: any, schema: ValidationSchema): ValidationResult {
  const errors: string[] = []
  const sanitizedData: any = {}

  for (const [fieldName, rule] of Object.entries(schema)) {
    const result = validateField(data[fieldName], rule, fieldName)
    
    if (!result.isValid) {
      errors.push(...result.errors)
    }
    
    sanitizedData[fieldName] = result.sanitizedValue
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitizedData
  }
}

// Predefined validation schemas
export const VALIDATION_SCHEMAS = {
  note: {
    title: {
      required: true,
      maxLength: 200,
      sanitize: SANITIZATION_FUNCTIONS.trim
    },
    content: {
      required: true,
      maxLength: 10000,
      sanitize: (value: string) => 
        SANITIZATION_FUNCTIONS.trim(
          SANITIZATION_FUNCTIONS.removeScripts(
            SANITIZATION_FUNCTIONS.normalizeWhitespace(value)
          )
        )
    }
  },
  
  goal: {
    title: {
      required: true,
      maxLength: 200,
      sanitize: SANITIZATION_FUNCTIONS.trim
    },
    description: {
      maxLength: 1000,
      sanitize: (value: string) => 
        SANITIZATION_FUNCTIONS.trim(
          SANITIZATION_FUNCTIONS.removeScripts(
            SANITIZATION_FUNCTIONS.normalizeWhitespace(value)
          )
        )
    },
    progress: {
      min: 0,
      max: 100,
      sanitize: SANITIZATION_FUNCTIONS.parseNumber
    },
    target_amount: {
      min: 0,
      sanitize: SANITIZATION_FUNCTIONS.parseNumber
    },
    current_amount: {
      min: 0,
      sanitize: SANITIZATION_FUNCTIONS.parseNumber
    }
  },
  
  task: {
    title: {
      required: true,
      maxLength: 200,
      sanitize: SANITIZATION_FUNCTIONS.trim
    },
    description: {
      maxLength: 1000,
      sanitize: (value: string) => 
        SANITIZATION_FUNCTIONS.trim(
          SANITIZATION_FUNCTIONS.removeScripts(
            SANITIZATION_FUNCTIONS.normalizeWhitespace(value)
          )
        )
    },
    priority: {
      pattern: /^(low|medium|high)$/
    }
  },
  
  financeEntry: {
    amount: {
      required: true,
      min: 0.01,
      max: 999999999,
      sanitize: SANITIZATION_FUNCTIONS.parseNumber,
      custom: (value: number) => {
        if (isNaN(value)) return 'Сумма должна быть числом'
        if (value <= 0) return 'Сумма должна быть больше нуля'
        return undefined
      }
    },
    note: {
      maxLength: 500,
      sanitize: (value: string) => 
        SANITIZATION_FUNCTIONS.trim(
          SANITIZATION_FUNCTIONS.removeScripts(
            SANITIZATION_FUNCTIONS.normalizeWhitespace(value)
          )
        )
    }
  },
  
  user: {
    email: {
      required: true,
      pattern: VALIDATION_PATTERNS.email,
      sanitize: SANITIZATION_FUNCTIONS.toLowerCase
    },
    password: {
      required: true,
      minLength: 8,
      pattern: VALIDATION_PATTERNS.strongPassword
    }
  }
} as const

// XSS protection - escapes all HTML (for plain text)
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Whitelist of allowed HTML tags for rich text content (notes, descriptions)
const ALLOWED_HTML_TAGS = [
  'p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'code', 'pre', 'span', 'a'
]

// Whitelist of allowed attributes
const ALLOWED_ATTRIBUTES = ['href', 'title', 'class', 'style']

// Sanitize rich text HTML - allows safe formatting tags but removes dangerous content
export function sanitizeRichTextHtml(input: string): string {
  if (typeof input !== 'string') return ''
  
  try {
    // Create a temporary DOM element to parse HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(input, 'text/html')
    const body = doc.body
    
    // Remove dangerous tags and attributes recursively
    const removeDangerous = (element: Element) => {
      // Remove script, iframe, object, embed, form, input, button
      const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'meta', 'link', 'style']
      dangerousTags.forEach(tag => {
        const elements = element.getElementsByTagName(tag)
        Array.from(elements).forEach(el => el.remove())
      })
      
      // Process all elements
      const allElements = element.querySelectorAll('*')
      allElements.forEach(el => {
        // Remove element if not in whitelist
        if (!ALLOWED_HTML_TAGS.includes(el.tagName.toLowerCase())) {
          // Replace with its content
          const parent = el.parentNode
          if (parent) {
            while (el.firstChild) {
              parent.insertBefore(el.firstChild, el)
            }
            parent.removeChild(el)
          }
          return
        }
        
        // Remove dangerous attributes
        const attrs = Array.from(el.attributes)
        attrs.forEach(attr => {
          const attrName = attr.name.toLowerCase()
          
          // Remove event handlers (onclick, onerror, etc.)
          if (attrName.startsWith('on')) {
            el.removeAttribute(attr.name)
            return
          }
          
          // Remove javascript: protocol
          if (attrName === 'href' || attrName === 'src') {
            const value = attr.value.toLowerCase()
            if (value.startsWith('javascript:') || value.startsWith('data:') || value.startsWith('vbscript:')) {
              el.removeAttribute(attr.name)
              return
            }
          }
          
          // Only keep allowed attributes
          if (!ALLOWED_ATTRIBUTES.includes(attrName)) {
            el.removeAttribute(attr.name)
          }
        })
      })
    }
    
    removeDangerous(body)
    
    return body.innerHTML
  } catch (error) {
    // If parsing fails, escape all HTML as fallback
    return sanitizeHtml(input)
  }
}

// SQL injection protection (for display purposes)
export function sanitizeForDisplay(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/['";\\]/g, '') // Remove potentially dangerous characters
    .replace(/script/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
}

// Input sanitization for different contexts
export const CONTEXT_SANITIZERS = {
  html: (input: string) => sanitizeHtml(input),
  display: (input: string) => sanitizeForDisplay(input),
  search: (input: string) => input.trim().replace(/[^\w\s\-а-яА-ЯёЁ]/gi, ''),
  filename: (input: string) => input.replace(/[<>:"/\\|?*]/g, '_'),
  url: (input: string) => encodeURIComponent(input),
  json: (input: any) => JSON.stringify(input)
}

// Data validation hook for forms
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  schema: ValidationSchema
) {
  const [values, setValues] = React.useState<T>(initialValues)
  const [errors, setErrors] = React.useState<Record<keyof T, string[]>>({} as Record<keyof T, string[]>)
  const [touched, setTouched] = React.useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>)

  const validateSingleField = React.useCallback((fieldName: keyof T, value: any): ValidationResult => {
    const rule = schema[fieldName as string]
    if (!rule) return { isValid: true, errors: [], sanitizedValue: value }

    const result = validateField(value, rule, String(fieldName))
    setErrors(prev => ({
      ...prev,
      [fieldName]: result.errors
    }))
    
    return result
  }, [schema])

  const validateAll = React.useCallback(() => {
    const result = validateObject(values, schema)
    setErrors(result.errors.reduce((acc, error) => {
      // Parse field name from error message (simplified)
      const fieldName = Object.keys(schema).find(key => error.includes(key))
      if (fieldName) {
        acc[fieldName as keyof T] = [...(acc[fieldName as keyof T] || []), error]
      }
      return acc
    }, {} as Record<keyof T, string[]>))
    
    return result.isValid
  }, [values, schema])

  const handleChange = React.useCallback((fieldName: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [fieldName]: value }))
    setTouched(prev => ({ ...prev, [fieldName]: true }))
    
    if (touched[fieldName]) {
      validateField(fieldName, value)
    }
  }, [touched, validateField])

  const handleBlur = React.useCallback((fieldName: keyof T) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }))
    validateField(fieldName, values[fieldName])
  }, [validateField, values])

  const reset = React.useCallback(() => {
    setValues(initialValues)
    setErrors({} as Record<keyof T, string[]>)
    setTouched({} as Record<keyof T, boolean>)
  }, [initialValues])

  return {
    values,
    errors,
    touched,
    isValid: Object.values(errors).every(fieldErrors => fieldErrors.length === 0),
    handleChange,
    handleBlur,
    validateField: validateSingleField,
    validateAll,
    reset
  }
}

// Import React for hooks
import React from 'react'

