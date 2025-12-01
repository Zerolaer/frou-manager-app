import React from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { formatCurrencyEUR } from '@/lib/format'

type ItemType = 'product' | 'service_period' | 'hourly'

interface InvoiceItem {
  description: string
  period?: string
  quantity: number
  price: number
  price_per_hour?: number
  hours?: number
  total: number
  item_type?: ItemType
}

interface InvoicePreviewProps {
  invoiceNumber: string
  date: string
  dueDate: string
  notes: string
  taxRate: number
  // FROM fields
  fromName?: string
  fromCountry?: string
  fromCity?: string
  fromProvince?: string
  fromAddressLine1?: string
  fromAddressLine2?: string
  fromPostalCode?: string
  fromAccountNumber?: string
  fromRoutingNumber?: string
  fromSwiftBic?: string
  fromBankName?: string
  fromBankAddress?: string
  // TO fields
  clientName: string
  clientEmail?: string
  clientAddress?: string
  clientPhone?: string
  items: InvoiceItem[]
  subtotal: number
  taxAmount: number
  total: number
}

export default function InvoicePreview({
  invoiceNumber,
  date,
  dueDate,
  notes,
  taxRate,
  fromName,
  fromCountry,
  fromCity,
  fromProvince,
  fromAddressLine1,
  fromAddressLine2,
  fromPostalCode,
  fromAccountNumber,
  fromRoutingNumber,
  fromSwiftBic,
  fromBankName,
  fromBankAddress,
  clientName,
  clientEmail,
  clientAddress,
  clientPhone,
  items,
  subtotal,
  taxAmount,
  total
}: InvoicePreviewProps) {
  const { t } = useSafeTranslation()

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  }

  const hasFromData = fromName || fromCountry || fromCity

  return (
    <div className="invoice-preview">
      <div className="invoice-preview-container">
        {/* Header */}
        <div className="invoice-preview-header">
          <div className="invoice-preview-title">INVOICE</div>
          <div className="invoice-preview-number">
            Invoice #{invoiceNumber || 'INV-001'}
          </div>
        </div>

        {/* From and To sections */}
        <div className="invoice-preview-addresses">
          {/* FROM Section */}
          {hasFromData && (
            <div className="invoice-preview-from">
              <div className="invoice-preview-section-title">{t('invoice.from')}</div>
              {fromName && <div className="invoice-preview-name">{fromName}</div>}
              <div className="invoice-preview-address">
                {fromAddressLine1 && <div>{fromAddressLine1}</div>}
                {fromAddressLine2 && <div>{fromAddressLine2}</div>}
                {(fromCity || fromProvince || fromPostalCode) && (
                  <div>{[fromCity, fromProvince, fromPostalCode].filter(Boolean).join(', ')}</div>
                )}
                {fromCountry && <div>{fromCountry}</div>}
              </div>
              {(fromAccountNumber || fromRoutingNumber || fromSwiftBic || fromBankName) && (
                <div className="invoice-preview-banking">
                  {fromAccountNumber && <div>Account: {fromAccountNumber}</div>}
                  {fromRoutingNumber && <div>Routing: {fromRoutingNumber}</div>}
                  {fromSwiftBic && <div>SWIFT/BIC: {fromSwiftBic}</div>}
                  {fromBankName && <div>{fromBankName}</div>}
                  {fromBankAddress && <div className="text-xs text-gray-500">{fromBankAddress}</div>}
                </div>
              )}
            </div>
          )}

          {/* TO Section */}
          <div className="invoice-preview-to">
            <div className="invoice-preview-section-title">{t('invoice.to')}</div>
            {clientName ? (
              <>
                <div className="invoice-preview-name">{clientName}</div>
                {clientEmail && <div className="invoice-preview-contact">{clientEmail}</div>}
                {clientPhone && <div className="invoice-preview-contact">{clientPhone}</div>}
                {clientAddress && (
                  <div className="invoice-preview-address whitespace-pre-line">
                    {clientAddress}
                  </div>
                )}
              </>
            ) : (
              <div className="invoice-preview-placeholder">{t('invoice.toName')}</div>
            )}
          </div>
        </div>

        {/* Invoice Details */}
        <div className="invoice-preview-details">
          <div className="invoice-preview-details-title">INVOICE DETAILS</div>
          <div className="invoice-preview-detail">
            <span>Date: {date ? formatDate(date) : '-'}</span>
          </div>
          <div className="invoice-preview-detail">
            <span>Due Date: {dueDate ? formatDate(dueDate) : '-'}</span>
          </div>
        </div>

        {/* Items Table */}
        <div className="invoice-preview-items">
          <table className="invoice-preview-table">
            <thead>
              <tr>
                <th className="invoice-preview-th">{t('invoice.itemDescription')}</th>
                {items.some(item => item.item_type === 'service_period' || item.period) && (
                  <th className="invoice-preview-th">{t('invoice.period')}</th>
                )}
                {items.some(item => item.item_type === 'product' || (!item.item_type && item.quantity > 1)) && (
                  <th className="invoice-preview-th text-right">{t('invoice.quantity')}</th>
                )}
                {items.some(item => item.item_type === 'hourly' || item.hours) && (
                  <th className="invoice-preview-th text-right">{t('invoice.hours')}</th>
                )}
                <th className="invoice-preview-th text-right">{t('invoice.price')}</th>
                <th className="invoice-preview-th text-right">{t('invoice.total')}</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, index) => {
                  const itemType = item.item_type || 'product'
                  const hasPeriod = items.some(i => i.item_type === 'service_period' || i.period)
                  const hasQuantity = items.some(i => i.item_type === 'product' || (!i.item_type && i.quantity > 1))
                  const hasHours = items.some(i => i.item_type === 'hourly' || i.hours)
                  
                  return (
                    <tr key={index}>
                      <td className="invoice-preview-td">{item.description || '-'}</td>
                      {hasPeriod && (
                        <td className="invoice-preview-td">
                          {itemType === 'service_period' && item.period ? item.period : (item.period || '-')}
                        </td>
                      )}
                      {hasQuantity && (
                        <td className="invoice-preview-td text-right">
                          {itemType === 'product' ? item.quantity : '-'}
                        </td>
                      )}
                      {hasHours && (
                        <td className="invoice-preview-td text-right">
                          {itemType === 'hourly' && item.hours ? item.hours : (item.hours || '-')}
                        </td>
                      )}
                      <td className="invoice-preview-td text-right">
                        {formatCurrencyEUR(item.price)}
                      </td>
                      <td className="invoice-preview-td text-right font-semibold">
                        {formatCurrencyEUR(item.total || item.quantity * item.price)}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="invoice-preview-td text-center text-gray-400">
                    {t('invoice.noItems')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="invoice-preview-totals">
          <div className="invoice-preview-total-row">
            <span>Subtotal:</span>
            <span className="font-semibold">{formatCurrencyEUR(subtotal)}</span>
          </div>
          {taxRate > 0 && (
            <div className="invoice-preview-total-row">
              <span>Tax ({taxRate}%):</span>
              <span className="font-semibold">{formatCurrencyEUR(taxAmount)}</span>
            </div>
          )}
          <div className="invoice-preview-total-divider"></div>
          <div className="invoice-preview-total-row invoice-preview-total-final">
            <span className="font-bold text-lg">Total:</span>
            <span className="font-bold text-lg">{formatCurrencyEUR(total)}</span>
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div className="invoice-preview-notes">
            <div className="invoice-preview-notes-title">NOTES</div>
            <div className="invoice-preview-notes-content whitespace-pre-line">{notes}</div>
          </div>
        )}

        {/* Footer */}
        <div className="invoice-preview-footer">
          Thank you for your business!
        </div>
      </div>
    </div>
  )
}

