import React, { useState, useEffect, useMemo } from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { supabase } from '@/lib/supabaseClient'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { Plus, FileText, Edit2, Download, X } from 'lucide-react'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { CoreInput, CoreTextarea } from '@/components/ui/CoreInput'
import { formatCurrencyEUR } from '@/lib/format'
import { exportInvoiceToPDF } from '@/utils/invoicePdf'
import InvoiceFolderSidebar from '@/components/invoice/InvoiceFolderSidebar'
import InvoiceCard from '@/components/invoice/InvoiceCard'
import Dropdown from '@/components/ui/Dropdown'
import '@/invoice.css'

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
  folder_id?: string | null
  created_at: string
  updated_at: string
}

function InvoicePageContent() {
  const { t } = useSafeTranslation()
  const { userId } = useSupabaseAuth()
  const { createSimpleFooter } = useModalActions()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [activeFolder, setActiveFolder] = useState<string | null>('ALL')
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [foldersCollapsed, setFoldersCollapsed] = useState(() => {
    const saved = localStorage.getItem('frovo_invoice_folders_collapsed')
    return saved === 'true'
  })

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState('')
  const [taxRate, setTaxRate] = useState(0)
  const [items, setItems] = useState<Omit<InvoiceItem, 'id'>[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [folders, setFolders] = useState<Array<{ id: string; name: string; color?: string }>>([])

  // SubHeader actions handler
  function handleSubHeaderAction(action: string) {
    switch (action) {
      case 'add-invoice':
        resetForm()
        setSelectedFolderId(activeFolder === 'ALL' ? null : activeFolder)
        setShowCreateModal(true)
        break
      default:
    }
  }

  // Listen for SubHeader actions
  useEffect(() => {
    const handleSubHeaderActionEvent = (event: CustomEvent) => {
      handleSubHeaderAction(event.detail)
    }
    
    window.addEventListener('subheader-action', handleSubHeaderActionEvent as EventListener)
    return () => {
      window.removeEventListener('subheader-action', handleSubHeaderActionEvent as EventListener)
    }
  }, [activeFolder])

  // Load folders
  useEffect(() => {
    if (!userId) return
    loadFolders()
  }, [userId])

  // Load invoices
  useEffect(() => {
    if (!userId) return
    loadInvoices()
  }, [userId, activeFolder])

  const loadFolders = async () => {
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('invoice_folders')
        .select('id, name, color')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      setFolders(data || [])
    } catch (error) {
      console.error('Error loading folders:', error)
    }
  }

  const loadInvoices = async () => {
    if (!userId) return
    setLoading(true)
    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (activeFolder !== 'ALL') {
        if (activeFolder) {
          query = query.eq('folder_id', activeFolder)
        } else {
          query = query.is('folder_id', null)
        }
      }

      const { data, error } = await query

      if (error) throw error

      // Load items for each invoice
      const invoicesWithItems = await Promise.all(
        (data || []).map(async (inv) => {
          const { data: itemsData } = await supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', inv.id)
            .order('position')

          return {
            ...inv,
            items: (itemsData || []).map(item => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              price: item.price,
              total: item.quantity * item.price
            }))
          } as Invoice
        })
      )

      setInvoices(invoicesWithItems)
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTotals = (invoiceItems: Omit<InvoiceItem, 'id'>[]) => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }

  const handleCreateInvoice = async () => {
    if (!userId || !invoiceNumber.trim() || !clientName.trim()) return

    const { subtotal, taxAmount, total } = calculateTotals(items)

    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: userId,
          invoice_number: invoiceNumber,
          client_name: clientName,
          client_email: clientEmail,
          client_address: clientAddress,
          date,
          due_date: dueDate,
          notes,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          folder_id: selectedFolderId
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Insert items
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          invoice_id: invoiceData.id,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          position: index
        }))

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert)

        if (itemsError) throw itemsError
      }

      await loadInvoices()
      resetForm()
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating invoice:', error)
    }
  }

  const handleUpdateInvoice = async () => {
    if (!selectedInvoice || !userId) return

    const { subtotal, taxAmount, total } = calculateTotals(items)

    try {
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          invoice_number: invoiceNumber,
          client_name: clientName,
          client_email: clientEmail,
          client_address: clientAddress,
          date,
          due_date: dueDate,
          notes,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          folder_id: selectedFolderId
        })
        .eq('id', selectedInvoice.id)

      if (invoiceError) throw invoiceError

      // Delete old items and insert new ones
      await supabase.from('invoice_items').delete().eq('invoice_id', selectedInvoice.id)

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          invoice_id: selectedInvoice.id,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          position: index
        }))

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert)

        if (itemsError) throw itemsError
      }

      await loadInvoices()
      setIsEditing(false)
      setSelectedInvoice(null)
    } catch (error) {
      console.error('Error updating invoice:', error)
    }
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
      const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)
      if (error) throw error
      await loadInvoices()
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(null)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error deleting invoice:', error)
    }
  }

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setInvoiceNumber(invoice.invoice_number)
    setClientName(invoice.client_name)
    setClientEmail(invoice.client_email || '')
    setClientAddress(invoice.client_address || '')
    setDate(invoice.date)
    setDueDate(invoice.due_date)
    setNotes(invoice.notes || '')
    setTaxRate(invoice.tax_rate || 0)
    setItems(invoice.items.map(({ id, ...rest }) => rest))
    setSelectedFolderId(invoice.folder_id || null)
    setIsEditing(true)
  }

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsEditing(false)
  }

  const resetForm = () => {
    setInvoiceNumber('')
    setClientName('')
    setClientEmail('')
    setClientAddress('')
    setDate(new Date().toISOString().split('T')[0])
    const d = new Date()
    d.setDate(d.getDate() + 30)
    setDueDate(d.toISOString().split('T')[0])
    setNotes('')
    setTaxRate(0)
    setItems([])
    setSelectedFolderId(null)
  }

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0, total: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof Omit<InvoiceItem, 'id'>, value: string | number) => {
    const newItems = [...items]
    const updatedItem = {
      ...newItems[index],
      [field]: value
    }
    if (field === 'quantity' || field === 'price') {
      updatedItem.total = updatedItem.quantity * updatedItem.price
    }
    newItems[index] = updatedItem
    setItems(newItems)
  }

  const { subtotal, taxAmount, total } = useMemo(() => calculateTotals(items), [items, taxRate])

  const handleExportPDF = async (invoice: Invoice) => {
    try {
      await exportInvoiceToPDF(invoice)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert(t('invoice.exportError'))
    }
  }

  // Filter invoices by active folder
  const filteredInvoices = useMemo(() => {
    if (activeFolder === 'ALL') return invoices
    if (activeFolder) {
      return invoices.filter(inv => inv.folder_id === activeFolder)
    }
    return invoices.filter(inv => !inv.folder_id)
  }, [invoices, activeFolder])

  return (
    <div className={`invoice-page ${foldersCollapsed ? 'is-collapsed' : ''}`}>
      {/* Левая область: панель папок */}
      {userId && (
        <InvoiceFolderSidebar 
          userId={userId} 
          activeId={activeFolder} 
          onChange={setActiveFolder}
          collapsed={foldersCollapsed}
          onToggleCollapse={() => {
            const newState = !foldersCollapsed
            setFoldersCollapsed(newState)
            localStorage.setItem('frovo_invoice_folders_collapsed', String(newState))
          }}
        />
      )}
      
      {/* Правая область: инвойсы */}
      <div className="invoice-content">
        {loading ? null : filteredInvoices.length === 0 ? (
          <div className="invoice-empty">
            <FileText className="invoice-empty-icon" />
            <div className="invoice-empty-title">{t('invoice.noInvoices')}</div>
            <div className="invoice-empty-description">{t('invoice.noInvoicesDescription')}</div>
          </div>
        ) : (
          <div className="invoice-grid">
            {filteredInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onEdit={handleEditInvoice}
                onDelete={handleDeleteInvoice}
                onExport={handleExportPDF}
                onView={handleViewInvoice}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <UnifiedModal
        open={showCreateModal || isEditing}
        onClose={() => {
          setShowCreateModal(false)
          setIsEditing(false)
          setSelectedInvoice(null)
          resetForm()
        }}
        title={isEditing ? t('invoice.editInvoice') : t('invoice.newInvoice')}
        size="xl"
        bodyClassName="px-5 py-4"
        footer={createSimpleFooter(
          {
            label: isEditing ? t('actions.save') : t('invoice.create'),
            onClick: isEditing ? handleUpdateInvoice : handleCreateInvoice,
            disabled: !invoiceNumber.trim() || !clientName.trim()
          },
          {
            label: t('actions.cancel'),
            onClick: () => {
              setShowCreateModal(false)
              setIsEditing(false)
              setSelectedInvoice(null)
              resetForm()
            }
          }
        )}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.invoiceNumber')}</label>
              <CoreInput
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.taxRate')} (%)</label>
              <CoreInput
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes.folder')}</label>
            <Dropdown
              value={selectedFolderId || ''}
              onChange={(value) => setSelectedFolderId(value ? String(value) : null)}
              options={[
                { value: '', label: t('notes.noFolder') },
                ...folders.map(f => ({ value: f.id, label: f.name }))
              ]}
              placeholder={t('notes.noFolder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.clientName')}</label>
            <CoreInput
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder={t('invoice.clientNamePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.clientEmail')}</label>
            <CoreInput
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder={t('invoice.clientEmailPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.clientAddress')}</label>
            <CoreTextarea
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder={t('invoice.clientAddressPlaceholder')}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.date')}</label>
              <CoreInput
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.dueDate')}</label>
              <CoreInput
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">{t('invoice.items')}</label>
              <button className="btn btn-outline" onClick={addItem}>
                <Plus className="w-4 h-4" />
                {t('invoice.addItem')}
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 p-3 border rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <CoreInput
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder={t('invoice.itemDescription')}
                      className="mb-2"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <CoreInput
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                        placeholder={t('invoice.quantity')}
                      />
                      <CoreInput
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                        placeholder={t('invoice.price')}
                      />
                    </div>
                    <div className="mt-2 text-sm font-medium text-gray-700">
                      {t('invoice.total')}: {formatCurrencyEUR(item.quantity * item.price)}
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="p-2 hover:bg-red-100 rounded self-start"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {t('invoice.noItems')}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.notes')}</label>
            <CoreTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('invoice.notesPlaceholder')}
              rows={3}
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('invoice.subtotal')}:</span>
              <span className="font-medium">{formatCurrencyEUR(subtotal)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('invoice.tax')} ({taxRate}%):</span>
                <span className="font-medium">{formatCurrencyEUR(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>{t('invoice.total')}:</span>
              <span>{formatCurrencyEUR(total)}</span>
            </div>
          </div>
        </div>
      </UnifiedModal>

      {/* View Modal */}
      {selectedInvoice && !isEditing && (
        <UnifiedModal
          open={!!selectedInvoice && !isEditing}
          onClose={() => {
            setSelectedInvoice(null)
            setIsEditing(false)
          }}
          title={selectedInvoice.invoice_number}
          size="xl"
          bodyClassName="px-5 py-4"
          footer={
            <div className="flex justify-between">
              <button
                className="btn btn-outline"
                onClick={() => handleExportPDF(selectedInvoice)}
              >
                <Download className="w-4 h-4" />
                {t('invoice.exportPDF')}
              </button>
              <div className="flex gap-2">
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setIsEditing(false)
                    setSelectedInvoice(null)
                  }}
                >
                  {t('actions.close')}
                </button>
                <button className="btn" onClick={() => handleEditInvoice(selectedInvoice)}>
                  <Edit2 className="w-4 h-4" />
                  {t('actions.edit')}
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{t('invoice.billTo')}</h3>
                <div className="text-sm">
                  <div className="font-semibold">{selectedInvoice.client_name}</div>
                  {selectedInvoice.client_email && <div>{selectedInvoice.client_email}</div>}
                  {selectedInvoice.client_address && <div className="whitespace-pre-line">{selectedInvoice.client_address}</div>}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{t('invoice.invoiceDetails')}</h3>
                <div className="text-sm space-y-1">
                  <div><span className="text-gray-500">{t('invoice.date')}:</span> {new Date(selectedInvoice.date).toLocaleDateString('ru-RU')}</div>
                  <div><span className="text-gray-500">{t('invoice.dueDate')}:</span> {new Date(selectedInvoice.due_date).toLocaleDateString('ru-RU')}</div>
                </div>
              </div>
            </div>

            <div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">{t('invoice.itemDescription')}</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">{t('invoice.quantity')}</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">{t('invoice.price')}</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">{t('invoice.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-3 text-sm">{item.description}</td>
                      <td className="py-2 px-3 text-sm text-right">{item.quantity}</td>
                      <td className="py-2 px-3 text-sm text-right">{formatCurrencyEUR(item.price)}</td>
                      <td className="py-2 px-3 text-sm text-right font-medium">{formatCurrencyEUR(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('invoice.subtotal')}:</span>
                <span className="font-medium">{formatCurrencyEUR(selectedInvoice.subtotal)}</span>
              </div>
              {selectedInvoice.tax_rate > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('invoice.tax')} ({selectedInvoice.tax_rate}%):</span>
                  <span className="font-medium">{formatCurrencyEUR(selectedInvoice.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>{t('invoice.total')}:</span>
                <span>{formatCurrencyEUR(selectedInvoice.total)}</span>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{t('invoice.notes')}</h3>
                <div className="text-sm text-gray-700 whitespace-pre-line">{selectedInvoice.notes}</div>
              </div>
            )}
          </div>
        </UnifiedModal>
      )}
    </div>
  )
}

export default function InvoicePage() {
  return <InvoicePageContent />
}
