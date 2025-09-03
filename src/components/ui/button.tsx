
import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export default function Button({ className = '', variant = 'default', size = 'md', ...rest }: Props){
  const v = variant === 'secondary' ? 'btn-secondary'
    : variant === 'danger' ? 'btn-danger'
    : variant === 'ghost' ? 'btn-ghost' : 'btn'
  const s = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''
  return <button className={`${v} ${s} ${className}`} {...rest} />
}
