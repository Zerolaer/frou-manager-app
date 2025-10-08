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
    <div className="flex items-center justify-between px-6 border-b border-gray-200 flex-shrink-0" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
      <div className="text-lg font-semibold text-gray-900 leading-none m-0 flex-1">{title}</div>
      <div className="flex items-center gap-2">
        {rightContent}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>
    </div>
  )
};

export default ModalHeader;

