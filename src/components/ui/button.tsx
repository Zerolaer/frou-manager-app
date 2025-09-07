import React from 'react'

type Variant = 'solid' | 'outline' | 'ghost' | 'accent'
type Size = 'xs' | 'sm' | 'md'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  solid: 'bg-blue-600 text-white hover:bg-blue-700',
  outline: 'border border-gray-300 text-gray-900 hover:bg-gray-50',
  ghost: 'text-gray-700 hover:bg-gray-100',
  accent: 'bg-gray-900 text-white hover:bg-black'
}

const sizeClasses: Record<Size, string> = {
  xs: 'h-8 px-3 text-xs',
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm'
}

export default function Button({ variant='solid', size='md', className='', ...props }: Props){
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
  const cls = [base, variantClasses[variant], sizeClasses[size], className].join(' ')
  return <button className={cls} {...props} />
}
