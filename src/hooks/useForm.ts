import { useState, useCallback, useRef, useEffect } from 'react'
import { logger } from '@/lib/monitoring'

export interface FormField<T = any> {
  value: T
  error?: string
  touched: boolean
  required?: boolean
}

export interface FormState<T extends Record<string, any>> {
  fields: { [K in keyof T]: FormField<T[K]> }
  isValid: boolean
  isDirty: boolean
  isSubmitting: boolean
}

export interface FormActions<T extends Record<string, any>> {
  setField: (field: keyof T, value: T[keyof T]) => void
  setError: (field: keyof T, error?: string) => void
  setTouched: (field: keyof T, touched?: boolean) => void
  reset: () => void
  submit: (onSubmit: (values: T) => Promise<void> | void) => Promise<void>
  validate: () => boolean
  setSubmitting: (submitting: boolean) => void
}

export interface UseFormOptions<T extends Record<string, any>> {
  initialValues: T
  validation?: {
    [K in keyof T]?: (value: T[K]) => string | undefined
  }
  onSubmit?: (values: T) => Promise<void> | void
  autoSave?: {
    delay: number
    onSave: (values: T) => Promise<void> | void
  }
}

/**
 * Universal form management hook
 * 
 * Usage:
 * ```tsx
 * const form = useForm({
 *   initialValues: { title: '', description: '', priority: 'normal' },
 *   validation: {
 *     title: (value) => !value.trim() ? 'Title is required' : undefined,
 *     priority: (value) => !['low', 'normal', 'high'].includes(value) ? 'Invalid priority' : undefined
 *   },
 *   autoSave: {
 *     delay: 1000,
 *     onSave: async (values) => await saveTask(values)
 *   }
 * })
 * 
 * return (
 *   <form onSubmit={(e) => { e.preventDefault(); form.submit(onSubmit) }}>
 *     <input 
 *       value={form.fields.title.value}
 *       onChange={(e) => form.setField('title', e.target.value)}
 *       onBlur={() => form.setTouched('title')}
 *     />
 *     {form.fields.title.touched && form.fields.title.error && (
 *       <span className="error">{form.fields.title.error}</span>
 *     )}
 *   </form>
 * )
 * ```
 */
export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
): FormState<T> & FormActions<T> {
  const { initialValues, validation = {}, onSubmit, autoSave } = options
  
  // Initialize form fields
  const initializeFields = useCallback(() => {
    const fields = {} as { [K in keyof T]: FormField<T[K]> }
    for (const key in initialValues) {
      fields[key] = {
        value: initialValues[key],
        error: undefined,
        touched: false,
        required: validation[key] !== undefined
      }
    }
    return fields
  }, [initialValues, validation])

  const [fields, setFields] = useState(() => initializeFields())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()

  // Calculate derived state
  const isValid = Object.values(fields).every(field => !field.error)
  const isDirty = Object.keys(fields).some(key => 
    fields[key].value !== initialValues[key]
  )

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !isDirty) return

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      const values = {} as T
      for (const key in fields) {
        values[key] = fields[key].value
      }
      
      autoSave.onSave(values).catch(error => {
        logger.error('Auto-save failed:', error)
      })
    }, autoSave.delay)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [fields, isDirty, autoSave])

  // Actions
  const setField = useCallback((field: keyof T, value: T[keyof T]) => {
    setFields(prev => {
      const newFields = { ...prev }
      const validator = validation[field]
      const error = validator ? validator(value) : undefined
      
      newFields[field] = {
        ...newFields[field],
        value,
        error,
        touched: true
      }
      
      return newFields
    })
  }, [validation])

  const setError = useCallback((field: keyof T, error?: string) => {
    setFields(prev => ({
      ...prev,
      [field]: { ...prev[field], error }
    }))
  }, [])

  const setTouched = useCallback((field: keyof T, touched = true) => {
    setFields(prev => ({
      ...prev,
      [field]: { ...prev[field], touched }
    }))
  }, [])

  const validate = useCallback(() => {
    let isValid = true
    const newFields = { ...fields }

    for (const key in fields) {
      const validator = validation[key]
      if (validator) {
        const error = validator(fields[key].value)
        if (error) {
          newFields[key] = { ...newFields[key], error, touched: true }
          isValid = false
        } else {
          newFields[key] = { ...newFields[key], error: undefined }
        }
      }
    }

    setFields(newFields)
    return isValid
  }, [fields, validation])

  const submit = useCallback(async (onSubmitFn?: (values: T) => Promise<void> | void) => {
    if (!validate()) {
      logger.warn('Form validation failed')
      return
    }

    setIsSubmitting(true)
    try {
      const values = {} as T
      for (const key in fields) {
        values[key] = fields[key].value
      }

      const submitFn = onSubmitFn || onSubmit
      if (submitFn) {
        await submitFn(values)
      }
    } catch (error) {
      logger.error('Form submission failed:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [validate, fields, onSubmit])

  const reset = useCallback(() => {
    setFields(initializeFields())
    setIsSubmitting(false)
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
  }, [initializeFields])

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting)
  }, [])

  return {
    fields,
    isValid,
    isDirty,
    isSubmitting,
    setField,
    setError,
    setTouched,
    reset,
    submit,
    validate,
    setSubmitting
  }
}

/**
 * Hook for simple form state without validation
 */
export function useSimpleForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState(initialValues)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setField = useCallback((field: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }))
  }, [])

  const reset = useCallback(() => {
    setValues(initialValues)
    setIsSubmitting(false)
  }, [initialValues])

  const submit = useCallback(async (onSubmit: (values: T) => Promise<void> | void) => {
    setIsSubmitting(true)
    try {
      await onSubmit(values)
    } finally {
      setIsSubmitting(false)
    }
  }, [values])

  return {
    values,
    isSubmitting,
    setField,
    reset,
    submit,
    setSubmitting: setIsSubmitting
  }
}
