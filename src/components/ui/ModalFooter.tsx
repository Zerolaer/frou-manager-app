import React from 'react'

type ModalFooterProps = {
  children: React.ReactNode
}

const ModalFooter = ({ children }: ModalFooterProps) => {
  return (
    <div className="px-6 border-t border-gray-200 bg-gray-50 flex-shrink-0 rounded-b-2xl" style={{ paddingTop: '16px', paddingBottom: '16px' }}>
      <div className="flex items-center justify-end gap-2">
        {children}
      </div>
    </div>
  )
};

export default ModalFooter;


