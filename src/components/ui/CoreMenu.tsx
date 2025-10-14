import React from 'react'
import Dropdown, { type DropdownOption } from './Dropdown'

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
        `relative flex h-[34px] w-[34px] px-0 justify-center items-center hover:bg-gray-100 transition-colors ${buttonClassName || ''}`
      }
      buttonStyle={{ borderRadius: '12px', backgroundColor: 'transparent', border: '1px solid #e5e7eb', color: '#000000', ...buttonStyle }}
      dropdownClassName={`min-w-48 ${dropdownClassName || ''}`}
      icon={
        <div style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '18px',
          height: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="currentColor"
            style={{ color: '#000000' }}
          >
            <circle cx="12" cy="6" r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
            <circle cx="12" cy="18" r="1.5"/>
          </svg>
        </div>
      }
      hideChevron={true}
    />
  )
}

export default CoreMenu


