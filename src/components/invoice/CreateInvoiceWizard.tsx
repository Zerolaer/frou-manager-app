import React, { useState, useEffect, useMemo } from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { supabase } from '@/lib/supabaseClient'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { CoreInput, CoreTextarea } from '@/components/ui/CoreInput'
import CustomDatePicker from '@/components/ui/CustomDatePicker'
import Dropdown from '@/components/ui/Dropdown'
import InvoicePreview from './InvoicePreview'
import { ChevronRight, ChevronLeft, Check, Folder, User, Building2, Plus } from 'lucide-react'
import { formatCurrencyEUR } from '@/lib/format'
import { useModalConfirm } from '@/utils/modalConfirm'

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

export default function CreateInvoiceWizard({ open, onClose, onCreateInvoice, userId, folders }: Props) {
  const { t } = useSafeTranslation()
  const { createSimpleFooter } = useModalActions()
  const { alert } = useModalConfirm()
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  // Step 1: Client & Folder
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientTemplate[]>([])
  
  // Step 2: From Template
  const [selectedFromTemplateId, setSelectedFromTemplateId] = useState<string | null>(null)
  const [fromTemplates, setFromTemplates] = useState<FromTemplate[]>([])
  
  // Step 3: Invoice Data
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
  
  // Load clients
  useEffect(() => {
    if (open && step === 1) {
      loadClients()
    }
  }, [open, step, userId])
  
  // Load from templates
  useEffect(() => {
    if (open && step === 2) {
      loadFromTemplates()
    }
  }, [open, step, userId])
  
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
  
  const selectedClient = clients.find(c => c.id === selectedClientId)
  const selectedFromTemplate = fromTemplates.find(f => f.id === selectedFromTemplateId)
  
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const taxAmount = (subtotal * taxRate) / 100
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }
  
  const { subtotal, taxAmount, total } = useMemo(() => calculateTotals(), [items, taxRate])
  
  const handleNext = async () => {
    if (step === 1 && !selectedClientId) {
      await alert('Выберите клиента', 'Внимание')
      return
    }
    if (step === 2 && !selectedFromTemplateId) {
      await alert('Выберите данные отправителя', 'Внимание')
      return
    }
    if (step < 3) {
      setStep(step + 1)
    }
  }
  
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }
  
  const handleFinish = async () => {
    if (!selectedClientId || !selectedFromTemplateId || !invoiceNumber.trim()) {
      await alert('Заполните все обязательные поля', 'Внимание')
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
        items,
        selectedClient,
        selectedFromTemplate
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
    setStep(1)
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
  
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          {t('invoice.selectClient') || 'Выберите клиента'}
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {clients.map(client => (
            <div
              key={client.id}
              onClick={() => setSelectedClientId(client.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedClientId === client.id
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">{client.name}</div>
              {client.email && <div className="text-sm text-gray-500">{client.email}</div>}
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Folder className="w-5 h-5" />
          {t('invoice.selectFolder') || 'Выберите папку (необязательно)'}
        </h3>
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
    </div>
  )
  
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          {t('invoice.selectFromTemplate') || 'Выберите данные отправителя'}
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {fromTemplates.map(template => (
            <div
              key={template.id}
              onClick={() => setSelectedFromTemplateId(template.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedFromTemplateId === template.id
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">{template.name}</div>
              {template.city && <div className="text-sm text-gray-500">{template.city}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
  
  const renderStep3 = () => (
    <div className="grid grid-cols-2 gap-6 h-full">
      <div className="overflow-y-auto pr-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.invoiceNumber')}</label>
            <CoreInput
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="INV-001"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.date')}</label>
              <CustomDatePicker value={date} onChange={setDate} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.dueDate')}</label>
              <CustomDatePicker value={dueDate} onChange={setDueDate} />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.taxRate')}</label>
            <CoreInput
              type="number"
              step="0.01"
              value={taxRate || ''}
              onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.notes')}</label>
            <CoreTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">{t('invoice.items')}</label>
              <button onClick={addItem} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus className="w-4 h-4" />
                {t('invoice.addItem')}
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
              <div className="space-y-2 max-h-96 overflow-y-auto">
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
                            onChange={(value) => updateItem(index, 'item_type', value as 'product' | 'service_period' | 'hourly')}
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
                                min="0"
                                value={item.quantity || ''}
                                onChange={(e) => {
                                  const qty = e.target.value === '' ? 0 : Number(e.target.value)
                                  updateItem(index, 'quantity', qty)
                                }}
                                placeholder={t('invoice.quantity')}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.price')}</label>
                              <CoreInput
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.price || ''}
                                onChange={(e) => {
                                  const price = e.target.value === '' ? 0 : Number(e.target.value)
                                  updateItem(index, 'price', price)
                                }}
                                placeholder={t('invoice.price')}
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
                                  placeholder={t('invoice.hours')}
                                />
                              </div>
                              {item.hours ? (
                                <>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.pricePerHour')}</label>
                                    <CoreInput
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={item.price_per_hour || ''}
                                      onChange={(e) => {
                                        const val = e.target.value
                                        updateItem(index, 'price_per_hour', val === '' ? 0 : Number(val) || 0)
                                      }}
                                      placeholder={t('invoice.pricePerHour')}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.total')}</label>
                                    <CoreInput
                                      type="number"
                                      step="0.01"
                                      value={item.total || 0}
                                      readOnly
                                      className="bg-gray-100 cursor-not-allowed"
                                      placeholder={t('invoice.total')}
                                    />
                                  </div>
                                </>
                              ) : (
                                <div className="col-span-2">
                                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.price')}</label>
                                  <CoreInput
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.price || ''}
                                    onChange={(e) => {
                                      const price = e.target.value === '' ? 0 : Number(e.target.value)
                                      updateItem(index, 'price', price)
                                    }}
                                    placeholder={t('invoice.price')}
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        
                        {itemType === 'hourly' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.hours')}</label>
                              <CoreInput
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.hours || ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  updateItem(index, 'hours', val === '' ? 0 : Number(val) || 0)
                                }}
                                placeholder={t('invoice.hours')}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.pricePerHour')}</label>
                              <CoreInput
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.price_per_hour || ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  updateItem(index, 'price_per_hour', val === '' ? 0 : Number(val) || 0)
                                }}
                                placeholder={t('invoice.pricePerHour')}
                              />
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-sm font-semibold text-gray-700">
                            {t('invoice.total')}: {formatCurrencyEUR(item.total)}
                          </div>
                          <button onClick={() => removeItem(index)} className="text-red-600 hover:text-red-700 text-sm">
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
        </div>
      </div>
      
      <div className="overflow-y-auto border-l pl-6">
        <InvoicePreview
          invoiceNumber={invoiceNumber}
          date={date}
          dueDate={dueDate}
          notes={notes}
          taxRate={taxRate}
          fromName={selectedFromTemplate?.name}
          fromCountry={selectedFromTemplate?.country}
          fromCity={selectedFromTemplate?.city}
          fromProvince={selectedFromTemplate?.province}
          fromAddressLine1={selectedFromTemplate?.address_line1}
          fromAddressLine2={selectedFromTemplate?.address_line2}
          fromPostalCode={selectedFromTemplate?.postal_code}
          fromAccountNumber={selectedFromTemplate?.account_number}
          fromRoutingNumber={selectedFromTemplate?.routing_number}
          fromSwiftBic={selectedFromTemplate?.swift_bic}
          fromBankName={selectedFromTemplate?.bank_name}
          fromBankAddress={selectedFromTemplate?.bank_address}
          clientName={selectedClient?.name || ''}
          clientEmail={selectedClient?.email}
          clientAddress={selectedClient?.address}
          clientPhone={selectedClient?.phone}
          items={items.map(item => ({ ...item, total: item.total }))}
          subtotal={subtotal}
          taxAmount={taxAmount}
          total={total}
        />
      </div>
    </div>
  )
  
  return (
    <UnifiedModal
      open={open}
      onClose={handleClose}
      title={`${t('invoice.newInvoice')} - ${t('common.step') || 'Шаг'} ${step}/3`}
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="px-4 py-2 text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('common.back') || 'Назад'}
          </button>
          
          <div className="flex gap-2">
            {step < 3 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2"
              >
                {t('common.next') || 'Далее'}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={loading || !invoiceNumber.trim()}
                className="px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {t('actions.create') || 'Создать'}
              </button>
            )}
          </div>
        </div>
      }
      size={step === 3 ? 'xl' : 'lg'}
      contentClassName={step === 3 ? 'w-[95vw] max-w-[95vw]' : undefined}
    >
      <div className={`py-6 ${step === 3 ? 'min-h-[600px]' : 'min-h-[500px]'}`}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </UnifiedModal>
  )
}

