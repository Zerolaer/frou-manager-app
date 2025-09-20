import React from 'react'
import { useFormValidation, validationRules } from '@/lib/validation'

interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea'
  placeholder?: string
  value: string | number
  onChange: (value: string | number) => void
  onBlur?: () => void
  error?: string[]
  touched?: boolean
  required?: boolean
  disabled?: boolean
  className?: string
}

export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error = [],
  touched = false,
  required = false,
  disabled = false,
  className = ''
}: FormFieldProps) {
  const hasError = touched && error.length > 0

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          rows={4}
          className={`
            w-full px-3 py-2 border rounded-lg text-sm outline-none
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${hasError 
              ? 'border-red-300 focus:ring-red-500' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          className={`
            w-full px-3 py-2 border rounded-lg text-sm outline-none
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${hasError 
              ? 'border-red-300 focus:ring-red-500' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
        />
      )}

      {hasError && (
        <div className="text-sm text-red-600">
          {error.map((err, index) => (
            <div key={index}>{err}</div>
          ))}
        </div>
      )}
    </div>
  )
}

interface FormProps {
  onSubmit: (values: Record<string, any>) => void
  children: React.ReactNode
  className?: string
}

export function Form({ onSubmit, children, className = '' }: FormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const values = Object.fromEntries(formData.entries())
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}
    </form>
  )
}

// Pre-configured form fields
export const FormFields = {
  Email: (props: Omit<FormFieldProps, 'type'>) => (
    <FormField {...props} type="email" />
  ),
  
  Password: (props: Omit<FormFieldProps, 'type'>) => (
    <FormField {...props} type="password" />
  ),
  
  Number: (props: Omit<FormFieldProps, 'type'>) => (
    <FormField {...props} type="number" />
  ),
  
  TextArea: (props: Omit<FormFieldProps, 'type'>) => (
    <FormField {...props} type="textarea" />
  )
}

// Common validation schemas
export const validationSchemas = {
  email: [validationRules.required(), validationRules.email()],
  password: [
    validationRules.required(),
    validationRules.minLength(6, 'Пароль должен содержать минимум 6 символов')
  ],
  required: [validationRules.required()],
  title: [
    validationRules.required(),
    validationRules.minLength(1, 'Заголовок не может быть пустым'),
    validationRules.maxLength(100, 'Заголовок слишком длинный')
  ],
  description: [
    validationRules.maxLength(500, 'Описание слишком длинное')
  ]
}
