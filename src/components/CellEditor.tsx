import { useEffect, useMemo, useRef, useState } from 'react'
import '@/ui.css'
import Modal from '@/components/Modal'

type Entry = {
  id: string
  amount: number
  description?: string
  inactive?: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: () => void

  /** Current cell entries (provide from parent) */
  entries: Entry[]
}

const eur = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
})

export default function CellEditor(props: Props) {
  const { open, onClose, onSave, entries } = props

  // Compute total from active entries only
  const total = useMemo(() => {
    return (entries ?? []).reduce((acc, e) => acc + (e.inactive ? 0 : (Number(e.amount) || 0)), 0)
  }, [entries])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Редактирование ячейки"
      footerStart={
        <div className="text-sm text-gray-500">
          Итого по ячейке:&nbsp;
          <span className="font-medium text-gray-900">{eur.format(total)}</span>
        </div>
      }
      footerEnd={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Сохранить
          </button>
        </>
      }
    >
      {/* Keep existing cell editor body here (list/inputs etc.) */}
    </Modal>
  )
}
