import React from 'react'
import Dropdown, { type DropdownOption } from './Dropdown'
import { MoreVertical } from 'lucide-react'

export type CoreMenuOption = DropdownOption & {
  destructive?: boolean
}

type CoreMenuProps = {
  options: CoreMenuOption[]
  onSelect: (value: string | number) => void
  className?: string
  buttonClassName?: string
  dropdownClassName?: string
  ariaLabel?: string
}

const CoreMenu: React.FC<CoreMenuProps> = ({
  options,
  onSelect,
  className,
  buttonClassName,
  dropdownClassName,
  ariaLabel = 'Меню'
}) => {
  // We pass a value that is never equal to any option to avoid selection highlighting
  const sentinelValue = '__menu__'

  // Map options to apply destructive styles through Dropdown's option states
  const mapped: DropdownOption[] = options.map((opt) => ({
    value: opt.value,
    label: opt.label,
    disabled: opt.disabled,
  }))

  return (
    <Dropdown
      options={mapped}
      value={sentinelValue}
      onChange={onSelect}
      placeholder=""
      aria-label={ariaLabel}
      className={className}
      buttonClassName={
        `h-8 px-2 rounded-lg hover:bg-gray-100 transition-colors ${buttonClassName || ''}`
      }
      dropdownClassName={`min-w-48 ${dropdownClassName || ''}`}
      icon={<MoreVertical className="w-4 h-4 text-gray-500" />}
    />
  )
}

export default CoreMenu


