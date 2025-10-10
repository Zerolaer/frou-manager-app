// Validation utilities

export type ValidationRule<T> = {
  validate: (value: T) => boolean | string
  message: string
}

export type ValidationResult = {
  isValid: boolean
  errors: string[]
}

export function createValidator<T>(rules: ValidationRule<T>[]) {
  return (value: T): ValidationResult => {
    const errors: string[] = []
    
    for (const rule of rules) {
      const result = rule.validate(value)
      if (result === false) {
        errors.push(rule.message)
      } else if (typeof result === 'string') {
        errors.push(result)
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Common validation rules
export const validationRules = {
  required: <T>(message = 'Поле обязательно для заполнения'): ValidationRule<T> => ({
    validate: (value) => {
      if (typeof value === 'string') return value.trim().length > 0
      if (typeof value === 'number') return !isNaN(value)
      return value != null
    },
    message
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => value.length >= min,
    message: message || `Минимум ${min} символов`
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => value.length <= max,
    message: message || `Максимум ${max} символов`
  }),

  email: (message = 'Некорректный email адрес'): ValidationRule<string> => ({
    validate: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value)
    },
    message
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value >= min,
    message: message || `Значение должно быть не менее ${min}`
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value <= max,
    message: message || `Значение должно быть не более ${max}`
  }),

  pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
    validate: (value) => regex.test(value),
    message
  })
}

// Form validation hook
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validators: Partial<Record<keyof T, ValidationRule<T[keyof T]>[]>>
) {
  const [values, setValues] = React.useState(initialValues)
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string[]>>>({})
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({})

  const validateField = React.useCallback((field: keyof T) => {
    const fieldValidators = validators[field]
    if (!fieldValidators) return

    const validator = createValidator(fieldValidators)
    const result = validator(values[field])
    
    setErrors(prev => ({
      ...prev,
      [field]: result.errors
    }))
  }, [values, validators])

  const validateForm = React.useCallback(() => {
    const newErrors: Partial<Record<keyof T, string[]>> = {}
    let isValid = true

    for (const field in validators) {
      const fieldValidators = validators[field]
      if (!fieldValidators) continue

      const validator = createValidator(fieldValidators)
      const result = validator(values[field])
      
      if (!result.isValid) {
        newErrors[field] = result.errors
        isValid = false
      }
    }

    setErrors(newErrors)
    return isValid
  }, [values, validators])

  const setValue = React.useCallback((field: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }))
    
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: [] }))
    }
  }, [errors])

  const setFieldTouched = React.useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field)
  }, [validateField])

  const reset = React.useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateField,
    validateForm,
    reset,
    isValid: Object.values(errors).every(fieldErrors => fieldErrors?.length === 0)
  }
}

// Import React for hooks
import React from 'react'
