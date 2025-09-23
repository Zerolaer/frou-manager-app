import React from 'react'

// Стандартные компоненты форм для модальных окон

interface ModalFieldProps {
  label: string
  required?: boolean
  error?: string
  helpText?: string
  children: React.ReactNode
}

export function ModalField({ label, required, error, helpText, children }: ModalFieldProps) {
  return (
    <div className="space-y-1">
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
  const baseClasses = 'w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors'
  const errorClasses = error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
  
  return (
    <input
      className={`${baseClasses} ${errorClasses} focus:ring-2 focus:border-transparent ${className}`}
      {...props}
    />
  )
}

interface ModalTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export function ModalTextarea({ error, className = '', ...props }: ModalTextareaProps) {
  const baseClasses = 'w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors resize-none'
  const errorClasses = error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
  
  return (
    <textarea
      className={`${baseClasses} ${errorClasses} focus:ring-2 focus:border-transparent ${className}`}
      {...props}
    />
  )
}

interface ModalSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export function ModalSelect({ error, className = '', children, ...props }: ModalSelectProps) {
  const baseClasses = 'w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors bg-white'
  const errorClasses = error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
  
  return (
    <select
      className={`${baseClasses} ${errorClasses} focus:ring-2 focus:border-transparent ${className}`}
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
