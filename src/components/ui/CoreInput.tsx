import React from 'react'

interface CoreInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export const CoreInput = React.forwardRef<HTMLInputElement, CoreInputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full inline-flex items-center px-4 py-2.5 rounded-xl bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 border outline-none ${className}`}
        style={{ borderColor: '#E5E7EB' }}
        {...props}
      />
    )
  }
)

CoreInput.displayName = 'CoreInput'

interface CoreTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string
}

export const CoreTextarea = React.forwardRef<HTMLTextAreaElement, CoreTextareaProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full px-4 py-3 rounded-xl bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 border outline-none resize-none ${className}`}
        style={{ borderColor: '#E5E7EB' }}
        {...props}
      />
    )
  }
)

CoreTextarea.displayName = 'CoreTextarea'

