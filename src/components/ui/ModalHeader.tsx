import React from 'react'
import { X } from 'lucide-react'

type ModalHeaderProps = {
  title: React.ReactNode
  onClose: () => void
  rightContent?: React.ReactNode
  showCloseButton?: boolean
}

const ModalHeader = ({ title, onClose, rightContent, showCloseButton = true }: ModalHeaderProps) => {
  return (
    <div className="flex items-center justify-between px-6 border-b border-gray-200 flex-shrink-0" style={{ paddingTop: '16px', paddingBottom: '16px' }}>
      <div className="font-semibold text-gray-900 leading-none m-0 flex-1" style={{ fontSize: '16px' }}>{title}</div>
      <div className="flex items-center gap-2">
        {rightContent}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="w-[34px] h-[34px] p-0 flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0"
            style={{ borderRadius: '12px' }}
            aria-label="Закрыть"
          >
            <X className="w-[16px] h-[16px] text-gray-500" />
          </button>
        )}
      </div>
    </div>
  )
};

export default ModalHeader;

