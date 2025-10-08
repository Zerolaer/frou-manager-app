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
  buttonStyle?: React.CSSProperties
  dropdownClassName?: string
  ariaLabel?: string
}

const CoreMenu: React.FC<CoreMenuProps> = ({
  options,
  onSelect,
  className,
  buttonClassName,
  buttonStyle,
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
        `h-[34px] w-[34px] px-0 justify-center items-center hover:bg-gray-100 transition-colors !gap-0 ${buttonClassName || ''}`
      }
      buttonStyle={{ borderRadius: '12px', backgroundColor: 'transparent', border: '1px solid #e5e7eb', color: '#000000', ...buttonStyle }}
      dropdownClassName={`min-w-48 ${dropdownClassName || ''}`}
      icon={<MoreVertical className="w-[18px] h-[18px]" style={{ color: '#000000', width: '18px', height: '18px', minWidth: '18px', minHeight: '18px' }} />}
      hideChevron={true}
    />
  )
}

export default CoreMenu


