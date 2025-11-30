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
import InvoiceClientsPanel from '@/components/invoice/InvoiceClientsPanel'
import InvoicePreview from '@/components/invoice/InvoicePreview'
import Dropdown from '@/components/ui/Dropdown'
import CustomDatePicker from '@/components/ui/CustomDatePicker'
import '@/invoice.css'

type ItemType = 'product' | 'service_period' | 'hourly'

interface InvoiceItem {
  id: string
  description: string
  period?: string
  quantity: number
  price: number
  price_per_hour?: number
  hours?: number
  total: number
  item_type?: ItemType
}

interface Invoice {
  id: string
  invoice_number: string
  date: string
  due_date: string
  notes: string
  // FROM (отправитель) данные
  from_name?: string
  from_country?: string
  from_city?: string
  from_province?: string
  from_address_line1?: string
  from_address_line2?: string
  from_postal_code?: string
  from_account_number?: string
  from_routing_number?: string
  from_swift_bic?: string
  from_bank_name?: string
  from_bank_address?: string
  // TO (клиент) данные
  client_name: string
  client_email?: string
  client_address?: string
  client_phone?: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  items: InvoiceItem[]
  folder_id?: string | null
  created_at: string
  updated_at: string
}

interface ClientTemplate {
  id: string
  name: string
  address?: string
  email?: string
  phone?: string
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
  
  // FROM (отправитель) state
  const [fromName, setFromName] = useState('')
  const [fromCountry, setFromCountry] = useState('')
  const [fromCity, setFromCity] = useState('')
  const [fromProvince, setFromProvince] = useState('')
  const [fromAddressLine1, setFromAddressLine1] = useState('')
  const [fromAddressLine2, setFromAddressLine2] = useState('')
  const [fromPostalCode, setFromPostalCode] = useState('')
  const [fromAccountNumber, setFromAccountNumber] = useState('')
  const [fromRoutingNumber, setFromRoutingNumber] = useState('')
  const [fromSwiftBic, setFromSwiftBic] = useState('')
  const [fromBankName, setFromBankName] = useState('')
  const [fromBankAddress, setFromBankAddress] = useState('')
  
  // TO (клиент) state
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  
  // Client templates
  const [clientTemplates, setClientTemplates] = useState<ClientTemplate[]>([])
  const [showClientTemplateModal, setShowClientTemplateModal] = useState(false)

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
    loadClientTemplates()
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

      if (error) {
        console.error('Error loading invoices:', error)
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          alert('Таблица invoices не существует!\n\nПожалуйста, выполните SQL скрипт:\nscripts/create-invoice-tables.sql\n\nв Supabase Dashboard → SQL Editor')
        } else {
          alert(`Ошибка загрузки инвойсов: ${error.message}`)
        }
        setInvoices([])
        setLoading(false)
        return
      }

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
              period: item.period || '',
              quantity: item.quantity,
              price: item.price,
              price_per_hour: item.price_per_hour || 0,
              hours: item.hours || 0,
              item_type: item.item_type || 'product',
              total: item.quantity * item.price
            }))
          } as Invoice
        })
      )

      setInvoices(invoicesWithItems)
    } catch (error) {
      console.error('Error loading invoices:', error)
      setInvoices([])
      if (error instanceof Error) {
        if (error.message.includes('does not exist') || error.message.includes('42P01')) {
          alert('Таблица invoices не существует!\n\nПожалуйста, выполните SQL скрипт:\nscripts/create-invoice-tables.sql\n\nв Supabase Dashboard → SQL Editor')
        } else {
          alert(`Ошибка загрузки инвойсов: ${error.message}`)
        }
      }
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
          date,
          due_date: dueDate,
          notes,
          // FROM fields
          from_name: fromName || null,
          from_country: fromCountry || null,
          from_city: fromCity || null,
          from_province: fromProvince || null,
          from_address_line1: fromAddressLine1 || null,
          from_address_line2: fromAddressLine2 || null,
          from_postal_code: fromPostalCode || null,
          from_account_number: fromAccountNumber || null,
          from_routing_number: fromRoutingNumber || null,
          from_swift_bic: fromSwiftBic || null,
          from_bank_name: fromBankName || null,
          from_bank_address: fromBankAddress || null,
          // TO fields
          client_name: clientName,
          client_email: clientEmail || null,
          client_address: clientAddress || null,
          client_phone: clientPhone || null,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          folder_id: selectedFolderId || null
        })
        .select()
        .single()

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError)
        alert(`Ошибка создания инвойса: ${invoiceError.message}\n\nПроверьте:\n1. Выполнен ли SQL скрипт create-invoice-tables.sql в Supabase?\n2. Существуют ли таблицы invoices и invoice_folders?`)
        return
      }

      if (!invoiceData) {
        alert('Ошибка: инвойс не был создан')
        return
      }

      // Insert items
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          invoice_id: invoiceData.id,
          description: item.description,
          period: item.period || null,
          quantity: item.quantity,
          price: item.price,
          price_per_hour: item.price_per_hour || null,
          hours: item.hours || null,
          item_type: item.item_type || 'product',
          position: index
        }))

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert)

        if (itemsError) {
          console.error('Error creating invoice items:', itemsError)
          alert(`Ошибка создания позиций: ${itemsError.message}`)
          // Удаляем созданный инвойс, если не удалось создать позиции
          await supabase.from('invoices').delete().eq('id', invoiceData.id)
          return
        }
      }

      await loadInvoices()
      resetForm()
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert(`Ошибка создания инвойса: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
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
          date,
          due_date: dueDate,
          notes,
          // FROM fields
          from_name: fromName || null,
          from_country: fromCountry || null,
          from_city: fromCity || null,
          from_province: fromProvince || null,
          from_address_line1: fromAddressLine1 || null,
          from_address_line2: fromAddressLine2 || null,
          from_postal_code: fromPostalCode || null,
          from_account_number: fromAccountNumber || null,
          from_routing_number: fromRoutingNumber || null,
          from_swift_bic: fromSwiftBic || null,
          from_bank_name: fromBankName || null,
          from_bank_address: fromBankAddress || null,
          // TO fields
          client_name: clientName,
          client_email: clientEmail || null,
          client_address: clientAddress || null,
          client_phone: clientPhone || null,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          folder_id: selectedFolderId || null
        })
        .eq('id', selectedInvoice.id)

      if (invoiceError) {
        console.error('Error updating invoice:', invoiceError)
        alert(`Ошибка обновления инвойса: ${invoiceError.message}`)
        return
      }

      // Delete old items and insert new ones
      const { error: deleteError } = await supabase.from('invoice_items').delete().eq('invoice_id', selectedInvoice.id)
      if (deleteError) {
        console.error('Error deleting old items:', deleteError)
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          invoice_id: selectedInvoice.id,
          description: item.description,
          period: item.period || null,
          quantity: item.quantity,
          price: item.price,
          price_per_hour: item.price_per_hour || null,
          hours: item.hours || null,
          item_type: item.item_type || 'product',
          position: index
        }))

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert)

        if (itemsError) {
          console.error('Error updating invoice items:', itemsError)
          alert(`Ошибка обновления позиций: ${itemsError.message}`)
          return
        }
      }

      await loadInvoices()
      setIsEditing(false)
      setSelectedInvoice(null)
    } catch (error) {
      console.error('Error updating invoice:', error)
      alert(`Ошибка обновления инвойса: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
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
    setDate(invoice.date)
    setDueDate(invoice.due_date)
    setNotes(invoice.notes || '')
    setTaxRate(invoice.tax_rate || 0)
    
    // FROM fields
    setFromName(invoice.from_name || '')
    setFromCountry(invoice.from_country || '')
    setFromCity(invoice.from_city || '')
    setFromProvince(invoice.from_province || '')
    setFromAddressLine1(invoice.from_address_line1 || '')
    setFromAddressLine2(invoice.from_address_line2 || '')
    setFromPostalCode(invoice.from_postal_code || '')
    setFromAccountNumber(invoice.from_account_number || '')
    setFromRoutingNumber(invoice.from_routing_number || '')
    setFromSwiftBic(invoice.from_swift_bic || '')
    setFromBankName(invoice.from_bank_name || '')
    setFromBankAddress(invoice.from_bank_address || '')
    
    // TO fields
    setClientName(invoice.client_name)
    setClientEmail(invoice.client_email || '')
    setClientAddress(invoice.client_address || '')
    setClientPhone(invoice.client_phone || '')
    
    setItems(invoice.items.map(({ id, ...rest }) => ({
      ...rest,
      period: rest.period || '',
      price_per_hour: rest.price_per_hour || 0,
      hours: rest.hours || 0
    })))
    setSelectedFolderId(invoice.folder_id || null)
    setIsEditing(true)
  }

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsEditing(false)
  }

  // Load FROM template from localStorage
  const loadFromTemplate = () => {
    try {
      const template = localStorage.getItem('frovo_invoice_from_template')
      if (template) {
        const data = JSON.parse(template)
        setFromName(data.fromName || '')
        setFromCountry(data.fromCountry || '')
        setFromCity(data.fromCity || '')
        setFromProvince(data.fromProvince || '')
        setFromAddressLine1(data.fromAddressLine1 || '')
        setFromAddressLine2(data.fromAddressLine2 || '')
        setFromPostalCode(data.fromPostalCode || '')
        setFromAccountNumber(data.fromAccountNumber || '')
        setFromRoutingNumber(data.fromRoutingNumber || '')
        setFromSwiftBic(data.fromSwiftBic || '')
        setFromBankName(data.fromBankName || '')
        setFromBankAddress(data.fromBankAddress || '')
      }
    } catch (error) {
      console.error('Error loading FROM template:', error)
    }
  }

  // Save FROM template to localStorage
  const saveFromTemplate = () => {
    try {
      const template = {
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
        fromBankAddress
      }
      localStorage.setItem('frovo_invoice_from_template', JSON.stringify(template))
      alert(t('invoice.fromTemplate') + ' ' + t('invoice.saved'))
    } catch (error) {
      console.error('Error saving FROM template:', error)
      alert('Ошибка сохранения шаблона')
    }
  }

  // Load client templates
  const loadClientTemplates = async () => {
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('invoice_client_templates')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setClientTemplates(data || [])
    } catch (error) {
      console.error('Error loading client templates:', error)
    }
  }

  // Load client template
  const loadClientTemplate = (template: ClientTemplate) => {
    setClientName(template.name || '')
    setClientEmail(template.email || '')
    setClientAddress(template.address || '')
    setClientPhone(template.phone || '')
  }

  // Save client template
  const saveClientTemplate = async () => {
    if (!userId || !clientName.trim()) {
      alert('Введите имя клиента')
      return
    }
    try {
      const { data, error } = await supabase
        .from('invoice_client_templates')
        .insert({
          user_id: userId,
          name: clientName,
          email: clientEmail,
          address: clientAddress,
          phone: clientPhone
        })
        .select()
        .single()
      
      if (error) throw error
      await loadClientTemplates()
      setShowClientTemplateModal(false)
      alert(t('invoice.clientTemplates') + ' ' + t('invoice.saved'))
    } catch (error) {
      console.error('Error saving client template:', error)
      alert(`Ошибка сохранения шаблона: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  const resetForm = () => {
    setInvoiceNumber('')
    setDate(new Date().toISOString().split('T')[0])
    const d = new Date()
    d.setDate(d.getDate() + 30)
    setDueDate(d.toISOString().split('T')[0])
    setNotes('')
    setTaxRate(0)
    setItems([])
    setSelectedFolderId(null)
    
    // Reset FROM fields
    setFromName('')
    setFromCountry('')
    setFromCity('')
    setFromProvince('')
    setFromAddressLine1('')
    setFromAddressLine2('')
    setFromPostalCode('')
    setFromAccountNumber('')
    setFromRoutingNumber('')
    setFromSwiftBic('')
    setFromBankName('')
    setFromBankAddress('')
    
    // Reset TO fields
    setClientName('')
    setClientEmail('')
    setClientAddress('')
    setClientPhone('')
    
    // Load FROM template if exists
    loadFromTemplate()
  }

  const addItem = () => {
    setItems([...items, { description: '', period: '', quantity: 1, price: 0, price_per_hour: 0, hours: 0, total: 0, item_type: 'product' }])
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
    
    // Recalculate total based on item type
    const itemType = updatedItem.item_type || 'product'
    if (itemType === 'product') {
      updatedItem.total = updatedItem.quantity * updatedItem.price
    } else if (itemType === 'service_period') {
      updatedItem.total = updatedItem.price
    } else if (itemType === 'hourly') {
      if (updatedItem.hours && updatedItem.price_per_hour) {
        updatedItem.total = updatedItem.hours * updatedItem.price_per_hour
        updatedItem.price = updatedItem.total
      }
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
      
      {/* Центральная область: инвойсы */}
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

      {/* Правая область: клиенты */}
      {userId && (
        <InvoiceClientsPanel
          userId={userId}
          onSelectClient={(clientName) => {
            setClientName(clientName)
            if (!showCreateModal && !isEditing) {
              resetForm()
              setShowCreateModal(true)
            }
          }}
        />
      )}

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
        bodyClassName="p-0"
        contentClassName="max-h-[90vh] !w-[95vw] !max-w-[1400px] invoice-create-modal"
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
        <div className="invoice-modal-split">
          {/* Left: Form */}
          <div className="invoice-modal-form">
            <div className="space-y-6 p-5 overflow-y-auto">
              {/* Basic Info */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.folder')}</label>
                <Dropdown
                  value={selectedFolderId || ''}
                  onChange={(value) => setSelectedFolderId(value ? String(value) : null)}
                  options={[
                    { value: '', label: t('invoice.noFolder') },
                    ...folders.map(f => ({ value: f.id, label: f.name }))
                  ]}
                  placeholder={t('invoice.noFolder')}
                />
              </div>

              {/* FROM Section */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">{t('invoice.from')}</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline text-xs"
                      onClick={loadFromTemplate}
                    >
                      {t('invoice.loadFromTemplate')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline text-xs"
                      onClick={saveFromTemplate}
                    >
                      {t('invoice.saveFromTemplate')}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromName')}</label>
                    <CoreInput value={fromName} onChange={(e) => setFromName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromCountry')}</label>
                    <CoreInput value={fromCountry} onChange={(e) => setFromCountry(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromCity')}</label>
                    <CoreInput value={fromCity} onChange={(e) => setFromCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromProvince')}</label>
                    <CoreInput value={fromProvince} onChange={(e) => setFromProvince(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromAddressLine1')}</label>
                    <CoreInput value={fromAddressLine1} onChange={(e) => setFromAddressLine1(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromAddressLine2')}</label>
                    <CoreInput value={fromAddressLine2} onChange={(e) => setFromAddressLine2(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromPostalCode')}</label>
                    <CoreInput value={fromPostalCode} onChange={(e) => setFromPostalCode(e.target.value)} />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Банковские данные</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromAccountNumber')}</label>
                      <CoreInput value={fromAccountNumber} onChange={(e) => setFromAccountNumber(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromRoutingNumber')}</label>
                      <CoreInput value={fromRoutingNumber} onChange={(e) => setFromRoutingNumber(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromSwiftBic')}</label>
                      <CoreInput value={fromSwiftBic} onChange={(e) => setFromSwiftBic(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromBankName')}</label>
                      <CoreInput value={fromBankName} onChange={(e) => setFromBankName(e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromBankAddress')}</label>
                      <CoreTextarea value={fromBankAddress} onChange={(e) => setFromBankAddress(e.target.value)} rows={2} />
                    </div>
                  </div>
                </div>
              </div>

              {/* TO Section */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">{t('invoice.to')}</h3>
                  <div className="flex gap-2">
                    {clientTemplates.length > 0 && (
                      <Dropdown
                        value=""
                        onChange={(value) => {
                          const template = clientTemplates.find(t => t.id === value)
                          if (template) loadClientTemplate(template)
                        }}
                        options={clientTemplates.map(t => ({ value: t.id, label: t.name }))}
                        placeholder={t('invoice.loadClientTemplate')}
                        buttonClassName="text-xs"
                      />
                    )}
                    <button
                      type="button"
                      className="btn btn-outline text-xs"
                      onClick={() => setShowClientTemplateModal(true)}
                    >
                      {t('invoice.saveClientTemplate')}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.toName')}</label>
                    <CoreInput
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder={t('invoice.clientNamePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.toEmail')}</label>
                    <CoreInput
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder={t('invoice.clientEmailPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.toPhone')}</label>
                    <CoreInput
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+1-855-413-7030"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.toAddress')}</label>
                    <CoreTextarea
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      placeholder={t('invoice.clientAddressPlaceholder')}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.date')}</label>
                  <CustomDatePicker
                    value={date}
                    onChange={setDate}
                    placeholder={t('invoice.date')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.dueDate')}</label>
                  <CustomDatePicker
                    value={dueDate}
                    onChange={setDueDate}
                    placeholder={t('invoice.dueDate')}
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
                  {items.map((item, index) => {
                    const itemType = item.item_type || 'product'
                    return (
                      <div key={index} className="flex gap-2 p-3 border rounded-lg bg-gray-50">
                        <div className="flex-1 space-y-2">
                          {/* Item Type Selector */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.itemType')}</label>
                            <Dropdown
                              value={itemType}
                              onChange={(value) => updateItem(index, 'item_type', value as ItemType)}
                              options={[
                                { value: 'product', label: t('invoice.itemTypeProduct') },
                                { value: 'service_period', label: t('invoice.itemTypeServicePeriod') },
                                { value: 'hourly', label: t('invoice.itemTypeHourly') }
                              ]}
                              buttonClassName="text-xs"
                            />
                          </div>
                          
                          {/* Description */}
                          <CoreInput
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder={t('invoice.itemDescription')}
                          />
                          
                          {/* Fields based on item type */}
                          {itemType === 'product' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.quantity')}</label>
                                <CoreInput
                                  type="number"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const qty = Number(e.target.value)
                                    updateItem(index, 'quantity', qty)
                                    updateItem(index, 'total', qty * item.price)
                                  }}
                                  placeholder={t('invoice.quantity')}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.price')}</label>
                                <CoreInput
                                  type="number"
                                  step="0.01"
                                  value={item.price}
                                  onChange={(e) => {
                                    const price = Number(e.target.value)
                                    updateItem(index, 'price', price)
                                    updateItem(index, 'total', item.quantity * price)
                                  }}
                                  placeholder={t('invoice.price')}
                                />
                              </div>
                            </div>
                          )}
                          
                          {itemType === 'service_period' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.period')}</label>
                                <CoreInput
                                  value={item.period || ''}
                                  onChange={(e) => updateItem(index, 'period', e.target.value)}
                                  placeholder="01.02.2025 - 30.02.2025"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.price')}</label>
                                <CoreInput
                                  type="number"
                                  step="0.01"
                                  value={item.price}
                                  onChange={(e) => {
                                    const price = Number(e.target.value)
                                    updateItem(index, 'price', price)
                                    updateItem(index, 'total', price)
                                  }}
                                  placeholder={t('invoice.price')}
                                />
                              </div>
                            </div>
                          )}
                          
                          {itemType === 'hourly' && (
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.hours')}</label>
                                <CoreInput
                                  type="number"
                                  step="0.01"
                                  value={item.hours || 0}
                                  onChange={(e) => {
                                    const hours = Number(e.target.value)
                                    updateItem(index, 'hours', hours)
                                    if (item.price_per_hour) {
                                      const total = hours * item.price_per_hour
                                      updateItem(index, 'price', total)
                                      updateItem(index, 'total', total)
                                    }
                                  }}
                                  placeholder={t('invoice.hours')}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.pricePerHour')}</label>
                                <CoreInput
                                  type="number"
                                  step="0.01"
                                  value={item.price_per_hour || 0}
                                  onChange={(e) => {
                                    const pricePerHour = Number(e.target.value)
                                    updateItem(index, 'price_per_hour', pricePerHour)
                                    if (item.hours) {
                                      const total = item.hours * pricePerHour
                                      updateItem(index, 'price', total)
                                      updateItem(index, 'total', total)
                                    }
                                  }}
                                  placeholder={t('invoice.pricePerHour')}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.total')}</label>
                                <CoreInput
                                  type="number"
                                  step="0.01"
                                  value={item.price}
                                  readOnly
                                  className="bg-gray-100"
                                  placeholder={t('invoice.total')}
                                />
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-2 text-sm font-medium text-gray-700">
                            {t('invoice.total')}: {formatCurrencyEUR(item.total || item.quantity * item.price)}
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(index)}
                          className="p-2 hover:bg-red-100 rounded self-start"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    )
                  })}
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
            </div>
          </div>

          {/* Right: Preview */}
          <div className="invoice-modal-preview">
            <InvoicePreview
              invoiceNumber={invoiceNumber}
              date={date}
              dueDate={dueDate}
              notes={notes}
              taxRate={taxRate}
              fromName={fromName}
              fromCountry={fromCountry}
              fromCity={fromCity}
              fromProvince={fromProvince}
              fromAddressLine1={fromAddressLine1}
              fromAddressLine2={fromAddressLine2}
              fromPostalCode={fromPostalCode}
              fromAccountNumber={fromAccountNumber}
              fromRoutingNumber={fromRoutingNumber}
              fromSwiftBic={fromSwiftBic}
              fromBankName={fromBankName}
              fromBankAddress={fromBankAddress}
              clientName={clientName}
              clientEmail={clientEmail}
              clientAddress={clientAddress}
              clientPhone={clientPhone}
              items={items}
              subtotal={subtotal}
              taxAmount={taxAmount}
              total={total}
            />
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
            <div className="flex items-center justify-between w-full">
              <button
                className="btn btn-outline"
                onClick={() => handleExportPDF(selectedInvoice)}
              >
                <Download className="w-4 h-4" />
                {t('invoice.exportPDF')}
              </button>
              <div className="flex items-center gap-2">
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

      {/* Client Template Modal */}
      <UnifiedModal
        open={showClientTemplateModal}
        onClose={() => setShowClientTemplateModal(false)}
        title={t('invoice.saveClientTemplate')}
        footer={createSimpleFooter(
          {
            label: t('actions.save'),
            onClick: saveClientTemplate,
            disabled: !clientName.trim()
          },
          {
            label: t('actions.cancel'),
            onClick: () => setShowClientTemplateModal(false)
          }
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.toName')}</label>
            <CoreInput
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder={t('invoice.clientNamePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.toEmail')}</label>
            <CoreInput
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder={t('invoice.clientEmailPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.toPhone')}</label>
            <CoreInput
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+1-855-413-7030"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.toAddress')}</label>
            <CoreTextarea
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder={t('invoice.clientAddressPlaceholder')}
              rows={3}
            />
          </div>
        </div>
      </UnifiedModal>
    </div>
  )
}

export default function InvoicePage() {
  return <InvoicePageContent />
}
