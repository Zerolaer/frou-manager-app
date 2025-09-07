import React from 'react'
import UIModal from '@/components/ui/Modal'

type Props = {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  subTitle?: React.ReactNode
  children?: React.ReactNode

  /** New: pass-through footer slots */
  footerStart?: React.ReactNode
  footerEnd?: React.ReactNode

  /** Back-compat footer */
  footer?: React.ReactNode
}

export default function Modal(props: Props) {
  return <UIModal {...props} />
}
