import React from 'react'

// Стандартные компоненты форм для модальных окон

interface ModalFieldProps {
  label: string
  required?: boolean
  error?: string
  helpText?: string
  children: React.ReactNode
  className?: string
}

export function ModalField({ label, required, error, helpText, children, className = '' }: ModalFieldProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helpText && !error && <p className="text-sm text-gray-500">{helpText}</p>}
    </div>
  )
}

interface ModalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export function ModalInput({ error, className = '', ...props }: ModalInputProps) {
  // Используем корпоративный CoreInput стиль
  return (
    <input
      className={`w-full inline-flex items-center px-4 py-2.5 rounded-xl bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 border outline-none ${className}`}
      style={{ borderColor: error ? '#ef4444' : '#E5E7EB' }}
      {...props}
    />
  )
}

interface ModalTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export function ModalTextarea({ error, className = '', ...props }: ModalTextareaProps) {
  // Используем корпоративный CoreTextarea стиль
  return (
    <textarea
      className={`w-full px-4 py-3 rounded-xl bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 border outline-none resize-none ${className}`}
      style={{ borderColor: error ? '#ef4444' : '#E5E7EB' }}
      {...props}
    />
  )
}

interface ModalSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export function ModalSelect({ error, className = '', children, ...props }: ModalSelectProps) {
  const baseClasses = 'w-full px-4 py-3 border rounded-xl text-sm outline-none transition-colors bg-white'
  const errorClasses = error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
  
  return (
    <select
      className={`${baseClasses} ${errorClasses} focus:ring-2 focus:border-transparent ${className}`}
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      {...props}
    >
      {children}
    </select>
  )
}

// Стандартная сетка для полей
interface ModalGridProps {
  children: React.ReactNode
  cols?: 1 | 2 | 3
  gap?: 'sm' | 'md' | 'lg'
}

export function ModalGrid({ children, cols = 2, gap = 'md' }: ModalGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  }
  
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  }
  
  return (
    <div className={`grid ${gridCols[cols]} ${gapClasses[gap]}`}>
      {children}
    </div>
  )
}

// Стандартный контейнер для модального контента
interface ModalContentProps {
  children: React.ReactNode
  className?: string
}

export function ModalContent({ children, className = '' }: ModalContentProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  )
}

// Стандартный разделитель
export function ModalDivider() {
  return <div className="border-t border-gray-200" />
}

// Стандартная группа кнопок
interface ModalButtonGroupProps {
  children: React.ReactNode
  className?: string
}

export function ModalButtonGroup({ children, className = '' }: ModalButtonGroupProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {children}
    </div>
  )
}
