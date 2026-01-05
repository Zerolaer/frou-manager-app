import React, { useState, useEffect, useMemo } from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { supabase } from '@/lib/supabaseClient'
import SideModal from '@/components/ui/SideModal'
import { ModalButton, useModalActions } from '@/components/ui/ModalSystem'
import { CoreInput, CoreTextarea } from '@/components/ui/CoreInput'
import CustomDatePicker from '@/components/ui/CustomDatePicker'
import Dropdown from '@/components/ui/Dropdown'
import InvoicePreview from './InvoicePreview'
import { Plus, Trash2, User, Building2, Folder } from 'lucide-react'
import { formatCurrencyEUR, formatCurrency } from '@/lib/format'
import { useModalConfirm } from '@/utils/modalConfirm'
import { useLocalStorage } from '@/hooks/useLocalStorage'

interface ClientTemplate {
  id: string
  name: string
  address?: string
  email?: string
  phone?: string
}

interface FromTemplate {
  id: string
  name: string
  country?: string
  city?: string
  province?: string
  address_line1?: string
  address_line2?: string
  postal_code?: string
  account_number?: string
  routing_number?: string
  swift_bic?: string
  bank_name?: string
  bank_address?: string
}

interface Folder {
  id: string
  name: string
  color?: string
}

interface InvoiceItem {
  description: string
  period?: string
  quantity: number
  price: number
  price_per_hour?: number
  hours?: number
  total: number
  item_type?: 'product' | 'service_period' | 'hourly'
}

interface Props {
  open: boolean
  onClose: () => void
  onCreateInvoice: (invoiceData: any) => Promise<void>
  userId: string
  folders: Folder[]
}

export default function CreateInvoiceModal({ open, onClose, onCreateInvoice, userId, folders }: Props) {
  const { t } = useSafeTranslation()
  const { createStandardFooter } = useModalActions()
  const { alert } = useModalConfirm()
  
  const [loading, setLoading] = useState(false)
  
  // Client & Folder
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientTemplate[]>([])
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [useClientTemplate, setUseClientTemplate] = useState(true)
  
  // From Template
  const [selectedFromTemplateId, setSelectedFromTemplateId] = useState<string | null>(null)
  const [fromTemplates, setFromTemplates] = useState<FromTemplate[]>([])
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
  const [useFromTemplate, setUseFromTemplate] = useState(true)
  
  // Invoice Data
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState('')
  const [taxRate, setTaxRate] = useState(0)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [defaultCurrency] = useLocalStorage('frovo_default_currency', 'EUR')
  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'GEL' | 'RUB'>(defaultCurrency as 'EUR' | 'USD' | 'GEL' | 'RUB' || 'EUR')
  
  // Load clients and from templates
  useEffect(() => {
    if (open && userId) {
      loadClients()
      loadFromTemplates()
    }
  }, [open, userId])
  
  const loadClients = async () => {
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('invoice_client_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }
  
  const loadFromTemplates = async () => {
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('invoice_from_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setFromTemplates(data || [])
    } catch (error) {
      console.error('Error loading from templates:', error)
    }
  }
  
  // Update client fields when template is selected
  useEffect(() => {
    if (useClientTemplate && selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId)
      if (client) {
        setClientName(client.name)
        setClientEmail(client.email || '')
        setClientAddress(client.address || '')
        setClientPhone(client.phone || '')
      }
    }
  }, [selectedClientId, clients, useClientTemplate])
  
  // Update from fields when template is selected
  useEffect(() => {
    if (useFromTemplate && selectedFromTemplateId) {
      const template = fromTemplates.find(f => f.id === selectedFromTemplateId)
      if (template) {
        setFromName(template.name)
        setFromCountry(template.country || '')
        setFromCity(template.city || '')
        setFromProvince(template.province || '')
        setFromAddressLine1(template.address_line1 || '')
        setFromAddressLine2(template.address_line2 || '')
        setFromPostalCode(template.postal_code || '')
        setFromAccountNumber(template.account_number || '')
        setFromRoutingNumber(template.routing_number || '')
        setFromSwiftBic(template.swift_bic || '')
        setFromBankName(template.bank_name || '')
        setFromBankAddress(template.bank_address || '')
      }
    }
  }, [selectedFromTemplateId, fromTemplates, useFromTemplate])
  
  const selectedClient = clients.find(c => c.id === selectedClientId)
  const selectedFromTemplate = fromTemplates.find(f => f.id === selectedFromTemplateId)
  
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const taxAmount = (subtotal * taxRate) / 100
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }
  
  const { subtotal, taxAmount, total } = useMemo(() => calculateTotals(), [items, taxRate])
  
  const handleCreate = async () => {
    if (!invoiceNumber.trim() || !clientName.trim()) {
      await alert('Заполните номер инвойса и имя клиента', 'Внимание')
      return
    }
    
    setLoading(true)
    try {
      const invoiceData = {
        clientId: selectedClientId,
        folderId: selectedFolderId,
        fromTemplateId: selectedFromTemplateId,
        invoiceNumber,
        date,
        dueDate,
        notes,
        taxRate,
        currency,
        items,
        // Client data (from template or manual)
        selectedClient: useClientTemplate && selectedClient ? selectedClient : {
          name: clientName,
          email: clientEmail,
          address: clientAddress,
          phone: clientPhone
        },
        // From data (from template or manual)
        selectedFromTemplate: useFromTemplate && selectedFromTemplate ? selectedFromTemplate : {
          name: fromName,
          country: fromCountry,
          city: fromCity,
          province: fromProvince,
          address_line1: fromAddressLine1,
          address_line2: fromAddressLine2,
          postal_code: fromPostalCode,
          account_number: fromAccountNumber,
          routing_number: fromRoutingNumber,
          swift_bic: fromSwiftBic,
          bank_name: fromBankName,
          bank_address: fromBankAddress
        }
      }
      await onCreateInvoice(invoiceData)
      handleClose()
    } catch (error) {
      console.error('Error creating invoice:', error)
      await alert(`Ошибка создания инвойса: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`, t('common.error') || 'Error')
    } finally {
      setLoading(false)
    }
  }
  
  const handleClose = () => {
    setSelectedClientId(null)
    setSelectedFolderId(null)
    setSelectedFromTemplateId(null)
    setInvoiceNumber('')
    setDate(new Date().toISOString().split('T')[0])
    const d = new Date()
    d.setDate(d.getDate() + 30)
    setDueDate(d.toISOString().split('T')[0])
    setNotes('')
    setTaxRate(0)
    setItems([])
    setCurrency(defaultCurrency as 'EUR' | 'USD' | 'GEL' | 'RUB' || 'EUR')
    setClientName('')
    setClientEmail('')
    setClientAddress('')
    setClientPhone('')
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
    setUseClientTemplate(true)
    setUseFromTemplate(true)
    onClose()
  }
  
  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0, total: 0, item_type: 'product' }])
  }
  
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }
  
  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items]
    const updatedItem = { ...newItems[index], [field]: value }
    
    // If changing item_type, reset fields that don't apply to new type
    if (field === 'item_type') {
      const newType = value as 'product' | 'service_period' | 'hourly'
      if (newType === 'product') {
        updatedItem.period = undefined
        updatedItem.hours = undefined
        updatedItem.price_per_hour = undefined
        updatedItem.quantity = updatedItem.quantity || 1
      } else if (newType === 'service_period') {
        updatedItem.quantity = 1
        updatedItem.price_per_hour = undefined
      } else if (newType === 'hourly') {
        updatedItem.quantity = 1
        updatedItem.period = undefined
        updatedItem.hours = updatedItem.hours || 0
        updatedItem.price_per_hour = updatedItem.price_per_hour || 0
      }
    }
    
    // Recalculate total based on item type
    const itemType = updatedItem.item_type || 'product'
    
    if (itemType === 'product') {
      updatedItem.total = (updatedItem.quantity || 1) * (updatedItem.price || 0)
    } else if (itemType === 'service_period') {
      if (updatedItem.hours && updatedItem.price_per_hour) {
        updatedItem.total = updatedItem.hours * updatedItem.price_per_hour
        updatedItem.price = updatedItem.total
      } else {
        updatedItem.total = updatedItem.price || 0
      }
    } else if (itemType === 'hourly') {
      const hours = updatedItem.hours || 0
      const pricePerHour = updatedItem.price_per_hour || 0
      updatedItem.total = hours * pricePerHour
      updatedItem.price = updatedItem.total
    }
    
    newItems[index] = updatedItem
    setItems(newItems)
  }
  
  // Get current client data for preview
  const currentClientData = useClientTemplate && selectedClient ? selectedClient : {
    name: clientName,
    email: clientEmail,
    address: clientAddress,
    phone: clientPhone
  }
  
  // Get current from data for preview
  const currentFromData = useFromTemplate && selectedFromTemplate ? selectedFromTemplate : {
    name: fromName,
    country: fromCountry,
    city: fromCity,
    province: fromProvince,
    address_line1: fromAddressLine1,
    address_line2: fromAddressLine2,
    postal_code: fromPostalCode,
    account_number: fromAccountNumber,
    routing_number: fromRoutingNumber,
    swift_bic: fromSwiftBic,
    bank_name: fromBankName,
    bank_address: fromBankAddress
  }
  
  return (
    <>
      {/* Left Modal - Form */}
      <SideModal
        open={open}
        onClose={handleClose}
        title={t('invoice.newInvoice') || 'Новый инвойс'}
        position="left"
        noBackdrop={false}
        customZIndex={100}
        splitView={true}
        splitViewWidth="calc(60vw - 24px)"
        disableBackdropClick={true}
        footer={createStandardFooter(
          { 
            label: t('actions.create') || 'Создать', 
            onClick: handleCreate, 
            loading: loading, 
            disabled: !invoiceNumber.trim() || !clientName.trim()
          },
          { label: t('actions.cancel') || 'Отмена', onClick: handleClose }
        )}
      >
        <div className="space-y-6 overflow-y-auto p-6">
          {/* 1. From Section */}
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {t('invoice.from') || 'От кого'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useFromTemplate}
                  onChange={(e) => setUseFromTemplate(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-xs text-gray-600">Использовать шаблон</span>
              </div>
            </div>
            
            {useFromTemplate ? (
              <Dropdown
                value={selectedFromTemplateId || ''}
                onChange={(value) => setSelectedFromTemplateId(value as string || null)}
                placeholder={t('invoice.selectFromTemplate') || 'Выберите данные отправителя'}
                options={[
                  { value: '', label: t('invoice.selectFromTemplate') || 'Выберите данные отправителя' },
                  ...fromTemplates.map(f => ({ value: f.id, label: f.name }))
                ]}
              />
            ) : (
              <div className="space-y-3">
                <CoreInput
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder={t('invoice.fromName') || 'Название'}
                />
                <div className="grid grid-cols-2 gap-2">
                  <CoreInput
                    value={fromCity}
                    onChange={(e) => setFromCity(e.target.value)}
                    placeholder={t('invoice.city') || 'Город'}
                  />
                  <CoreInput
                    value={fromProvince}
                    onChange={(e) => setFromProvince(e.target.value)}
                    placeholder={t('invoice.province') || 'Область'}
                  />
                </div>
                <CoreInput
                  value={fromAddressLine1}
                  onChange={(e) => setFromAddressLine1(e.target.value)}
                  placeholder={t('invoice.addressLine1') || 'Адрес строка 1'}
                />
                <CoreInput
                  value={fromAddressLine2}
                  onChange={(e) => setFromAddressLine2(e.target.value)}
                  placeholder={t('invoice.addressLine2') || 'Адрес строка 2'}
                />
                <div className="grid grid-cols-2 gap-2">
                  <CoreInput
                    value={fromPostalCode}
                    onChange={(e) => setFromPostalCode(e.target.value)}
                    placeholder={t('invoice.postalCode') || 'Почтовый индекс'}
                  />
                  <CoreInput
                    value={fromCountry}
                    onChange={(e) => setFromCountry(e.target.value)}
                    placeholder={t('invoice.country') || 'Страна'}
                  />
                </div>
                <div className="pt-2 border-t">
                  <div className="text-xs font-medium text-gray-600 mb-2">Банковские данные</div>
                  <div className="space-y-2">
                    <CoreInput
                      value={fromAccountNumber}
                      onChange={(e) => setFromAccountNumber(e.target.value)}
                      placeholder={t('invoice.accountNumber') || 'Номер счета'}
                    />
                    <CoreInput
                      value={fromBankName}
                      onChange={(e) => setFromBankName(e.target.value)}
                      placeholder={t('invoice.bankName') || 'Название банка'}
                    />
                    <CoreInput
                      value={fromSwiftBic}
                      onChange={(e) => setFromSwiftBic(e.target.value)}
                      placeholder={t('invoice.swiftBic') || 'SWIFT/BIC'}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 2. Client Section */}
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('invoice.client') || 'Кому'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useClientTemplate}
                  onChange={(e) => setUseClientTemplate(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-xs text-gray-600">Использовать шаблон</span>
              </div>
            </div>
            
            {useClientTemplate ? (
              <Dropdown
                value={selectedClientId || ''}
                onChange={(value) => setSelectedClientId(value as string || null)}
                placeholder={t('invoice.selectClient') || 'Выберите клиента'}
                options={[
                  { value: '', label: t('invoice.selectClient') || 'Выберите клиента' },
                  ...clients.map(c => ({ value: c.id, label: c.name }))
                ]}
              />
            ) : (
              <div className="space-y-3">
                <CoreInput
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={t('invoice.clientName') || 'Имя клиента'}
                />
                <CoreInput
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder={t('invoice.clientEmail') || 'Email'}
                  type="email"
                />
                <CoreTextarea
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder={t('invoice.clientAddress') || 'Адрес'}
                  rows={2}
                />
                <CoreInput
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder={t('invoice.clientPhone') || 'Телефон'}
                />
              </div>
            )}
          </div>
          
          {/* 3. Invoice Number and Date */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{t('invoice.invoiceNumber') || 'Номер инвойса'}</label>
              <CoreInput
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-001"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{t('invoice.date') || 'Дата выставления'}</label>
              <CustomDatePicker value={date} onChange={setDate} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{t('common.currency') || 'Валюта'}</label>
              <Dropdown
                value={currency}
                onChange={(value) => setCurrency(value as 'EUR' | 'USD' | 'GEL' | 'RUB')}
                options={[
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'GEL', label: 'GEL (₾)' },
                  { value: 'RUB', label: 'RUB (₽)' }
                ]}
              />
            </div>
          </div>
          
          {/* 4. Folder */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Folder className="w-4 h-4" />
              {t('invoice.folder') || 'Папка инвойса'}
            </label>
            <Dropdown
              value={selectedFolderId || ''}
              onChange={(value) => setSelectedFolderId(value as string || null)}
              placeholder={t('invoice.noFolder') || 'Без папки'}
              options={[
                { value: '', label: t('invoice.noFolder') || 'Без папки' },
                ...folders.map(f => ({ value: f.id, label: f.name }))
              ]}
            />
          </div>
          
          {/* 5. Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">{t('invoice.items') || 'Позиции'}</label>
              <button
                onClick={addItem}
                className="text-sm text-black hover:text-gray-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('invoice.addItem') || 'Добавить позицию'}
              </button>
            </div>
            
            {items.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">{t('invoice.noItems') || 'Нет позиций'}</p>
                  <p className="text-xs text-gray-400">{t('invoice.clickAddItem') || 'Нажмите \"Добавить позицию\" чтобы начать'}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {items.map((item, index) => {
                  const itemType = item.item_type || 'product'
                  return (
                    <div key={index} className="flex gap-2 p-3 border rounded-lg bg-gray-50">
                      <div className="flex-1 space-y-2">
                        {/* Item Type Selector */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.itemType') || 'Тип позиции'}</label>
                          <Dropdown
                            value={itemType}
                            onChange={(value) => updateItem(index, 'item_type', value as 'product' | 'service_period' | 'hourly')}
                            options={[
                              { value: 'product', label: t('invoice.itemTypeProduct') || 'Товар' },
                              { value: 'service_period', label: t('invoice.itemTypeServicePeriod') || 'Услуга (период)' },
                              { value: 'hourly', label: t('invoice.itemTypeHourly') || 'Почасовая оплата' }
                            ]}
                            buttonClassName="text-xs"
                          />
                        </div>
                        
                        {/* Description */}
                        <CoreInput
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder={t('invoice.itemDescription') || 'Описание'}
                        />
                        
                        {/* Fields based on item type */}
                        {itemType === 'product' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.quantity') || 'Количество'}</label>
                              <CoreInput
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.quantity || ''}
                                onChange={(e) => {
                                  const qty = e.target.value === '' ? 0 : Number(e.target.value)
                                  updateItem(index, 'quantity', qty)
                                }}
                                placeholder={t('invoice.quantity') || 'Количество'}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.price') || 'Цена'}</label>
                              <CoreInput
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.price || ''}
                                onChange={(e) => {
                                  const price = e.target.value === '' ? 0 : Number(e.target.value)
                                  updateItem(index, 'price', price)
                                }}
                                placeholder={t('invoice.price') || 'Цена'}
                              />
                            </div>
                          </div>
                        )}
                        
                        {itemType === 'service_period' && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.dateFrom') || 'Дата от'}</label>
                                <CustomDatePicker
                                  value={item.period?.split(' - ')[0] || ''}
                                  onChange={(date) => {
                                    const currentTo = item.period?.split(' - ')[1] || ''
                                    updateItem(index, 'period', date + (currentTo ? ' - ' + currentTo : ''))
                                  }}
                                  placeholder={t('invoice.dateFrom') || 'Дата от'}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.dateTo') || 'Дата до'}</label>
                                <CustomDatePicker
                                  value={item.period?.split(' - ')[1] || ''}
                                  onChange={(date) => {
                                    const currentFrom = item.period?.split(' - ')[0] || ''
                                    updateItem(index, 'period', (currentFrom || '') + (currentFrom && date ? ' - ' : '') + date)
                                  }}
                                  placeholder={t('invoice.dateTo') || 'Дата до'}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.hours')} ({t('common.optional') || 'опционально'})</label>
                                <CoreInput
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.hours || ''}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    updateItem(index, 'hours', val === '' ? 0 : Number(val) || 0)
                                  }}
                                  placeholder={t('invoice.hours') || 'Часы'}
                                />
                              </div>
                              {item.hours ? (
                                <>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.pricePerHour') || 'Цена за час'}</label>
                                    <CoreInput
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={item.price_per_hour || ''}
                                      onChange={(e) => {
                                        const val = e.target.value
                                        updateItem(index, 'price_per_hour', val === '' ? 0 : Number(val) || 0)
                                      }}
                                      placeholder={t('invoice.pricePerHour') || 'Цена за час'}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.total') || 'Итого'}</label>
                                    <CoreInput
                                      type="number"
                                      step="0.01"
                                      value={item.total || 0}
                                      readOnly
                                      className="bg-gray-100 cursor-not-allowed"
                                      placeholder={t('invoice.total') || 'Итого'}
                                    />
                                  </div>
                                </>
                              ) : (
                                <div className="col-span-2">
                                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.price') || 'Цена'}</label>
                                  <CoreInput
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.price || ''}
                                    onChange={(e) => {
                                      const price = e.target.value === '' ? 0 : Number(e.target.value)
                                      updateItem(index, 'price', price)
                                    }}
                                    placeholder={t('invoice.price') || 'Цена'}
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        
                        {itemType === 'hourly' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.hours') || 'Часы'}</label>
                              <CoreInput
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.hours || ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  updateItem(index, 'hours', val === '' ? 0 : Number(val) || 0)
                                }}
                                placeholder={t('invoice.hours') || 'Часы'}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.pricePerHour') || 'Цена за час'}</label>
                              <CoreInput
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.price_per_hour || ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  updateItem(index, 'price_per_hour', val === '' ? 0 : Number(val) || 0)
                                }}
                                placeholder={t('invoice.pricePerHour') || 'Цена за час'}
                              />
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-sm font-semibold text-gray-700">
                            {t('invoice.total') || 'Итого'}: {formatCurrency(item.total, currency)}
                          </div>
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            {t('actions.delete') || 'Удалить'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* 6. Due Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('invoice.dueDate') || 'Дата оплаты'}</label>
            <CustomDatePicker value={dueDate} onChange={setDueDate} />
          </div>
          
          {/* 7. Tax Rate */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('invoice.taxRate') || 'Tax Rate (%)'}</label>
            <CoreInput
              type="number"
              step="0.01"
              value={taxRate || ''}
              onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          
          {/* 8. Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('invoice.notes') || 'Notes'}</label>
            <CoreTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t('invoice.notesPlaceholder') || 'Дополнительная информация...'}
            />
          </div>
        </div>
      </SideModal>

      {/* Right Modal - Preview */}
      <SideModal
        open={open}
        onClose={handleClose}
        position="right"
        noBackdrop={true}
        customZIndex={110}
        splitView={true}
        splitViewWidth="calc(40vw - 24px)"
        showCloseButton={false}
        noPadding={true}
      >
        <div className="h-full w-full flex flex-col overflow-y-auto p-6" style={{ backgroundColor: '#F2F7FA' }}>
          <InvoicePreview
            invoiceNumber={invoiceNumber}
            date={date}
            dueDate={dueDate}
            notes={notes}
            taxRate={taxRate}
            currency={currency}
            fromName={currentFromData.name}
            fromCountry={currentFromData.country}
            fromCity={currentFromData.city}
            fromProvince={currentFromData.province}
            fromAddressLine1={currentFromData.address_line1}
            fromAddressLine2={currentFromData.address_line2}
            fromPostalCode={currentFromData.postal_code}
            fromAccountNumber={currentFromData.account_number}
            fromRoutingNumber={currentFromData.routing_number}
            fromSwiftBic={currentFromData.swift_bic}
            fromBankName={currentFromData.bank_name}
            fromBankAddress={currentFromData.bank_address}
            clientName={currentClientData.name || ''}
            clientEmail={currentClientData.email}
            clientAddress={currentClientData.address}
            clientPhone={currentClientData.phone}
            items={items.map(item => ({ ...item, total: item.total }))}
            subtotal={subtotal}
            taxAmount={taxAmount}
            total={total}
          />
        </div>
      </SideModal>
    </>
  )
}
