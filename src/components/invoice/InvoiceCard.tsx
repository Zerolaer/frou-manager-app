import React from 'react'
import { Edit2, Download, Calendar, User, FileText, X } from 'lucide-react'
import { formatCurrencyEUR } from '@/lib/format'
import { useSafeTranslation } from '@/utils/safeTranslation'

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  price: number
  total: number
}

interface Invoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  client_address: string
  date: string
  due_date: string
  notes: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  items: InvoiceItem[]
  created_at: string
  updated_at: string
}

type Props = {
  invoice: Invoice
  onEdit: (invoice: Invoice) => void
  onDelete: (invoiceId: string) => void
  onExport: (invoice: Invoice) => void
  onView: (invoice: Invoice) => void
}

const InvoiceCard = ({ invoice, onEdit, onDelete, onExport, onView }: Props) => {
  const { t } = useSafeTranslation()

  const handleClick = () => {
    onView(invoice)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(invoice)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(t('invoice.confirmDelete'))) {
      onDelete(invoice.id)
    }
  }

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation()
    onExport(invoice)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div
      className="rounded-2xl shadow-sm border border-gray-200 bg-white hover:shadow-md transition-all duration-200 p-5 flex flex-col gap-4 cursor-pointer group"
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {invoice.invoice_number}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User className="w-3.5 h-3.5" />
            <span className="truncate">{invoice.client_name}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleEdit}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="Редактировать"
          >
            <Edit2 className="w-4 h-4 text-gray-600" />
          </button>
                  <button
                    onClick={handleDelete}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    title="Удалить"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
        </div>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(invoice.date)}</span>
        </div>
        {invoice.due_date && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-300">•</span>
            <span>До: {formatDate(invoice.due_date)}</span>
          </div>
        )}
      </div>

      {/* Items count */}
      {invoice.items && invoice.items.length > 0 && (
        <div className="text-xs text-gray-500">
          {t('invoice.items')}: {invoice.items.length}
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-500">{t('invoice.total')}</span>
        <span className="text-base font-bold text-gray-900">
          {formatCurrencyEUR(invoice.total)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleExport}
          className="btn btn-outline flex-1 text-xs py-2"
        >
          <Download className="w-3.5 h-3.5" />
          PDF
        </button>
      </div>
    </div>
  )
}

export default InvoiceCard

