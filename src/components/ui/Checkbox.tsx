import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: React.ReactNode
  size?: 'sm' | 'md'
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, size = 'md', ...props }, ref) => {
    const checkboxSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
    
    const checkbox = (
      <div className="relative">
        <input
          type="checkbox"
          className={cn(
            "sr-only",
            className
          )}
          ref={ref}
          {...props}
        />
        <div className={cn(
          "flex items-center justify-center rounded-lg border-2 transition-all duration-200 cursor-pointer",
          "bg-white border-gray-300 hover:border-gray-400",
          "checked:bg-blue-600 checked:border-blue-600",
          "focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          checkboxSize,
          props.checked && "bg-blue-600 border-blue-600"
        )}>
          {props.checked && (
            <Check className={cn("text-white", iconSize)} />
          )}
        </div>
      </div>
    )

    if (label) {
      return (
        <label className="flex items-center gap-3 cursor-pointer">
          {checkbox}
          <span className="text-sm text-gray-700 select-none">{label}</span>
        </label>
      )
    }

    return checkbox
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
