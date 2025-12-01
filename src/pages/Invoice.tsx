import React, { useState, useEffect, useMemo } from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { supabase } from '@/lib/supabaseClient'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { Plus, FileText, Edit2, Download, X, Upload, Save, Edit2 as EditIcon } from 'lucide-react'
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
  
  // PDF Theme customization (header + table)
  const pdfThemes = [
    { id: 'classic', name: 'Классическая', color: '#1e293b' },
    { id: 'green', name: 'Зеленая', color: '#059669' },
    { id: 'blue', name: 'Синяя', color: '#2563eb' },
    { id: 'purple', name: 'Фиолетовая', color: '#7c3aed' },
    { id: 'red', name: 'Красная', color: '#dc2626' },
    { id: 'orange', name: 'Оранжевая', color: '#ea580c' },
    { id: 'teal', name: 'Бирюзовая', color: '#0891b2' },
    { id: 'pink', name: 'Розовая', color: '#be185d' }
  ]
  
  const [pdfThemeId, setPdfThemeId] = useState(() => {
    const saved = localStorage.getItem('frovo_invoice_pdf_theme_id')
    return saved || 'classic'
  })
  
  const pdfThemeColor = pdfThemes.find(t => t.id === pdfThemeId)?.color || '#1e293b'
  
  // FROM section - saved template state
  const [fromDataSaved, setFromDataSaved] = useState(false)
  const [isEditingFrom, setIsEditingFrom] = useState(false)
  const [bankDataFilled, setBankDataFilled] = useState(false)
  
  // TO (клиент) state
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  
  // TO section - track if data changed
  const [toDataChanged, setToDataChanged] = useState(false)
  const [originalToData, setOriginalToData] = useState({ name: '', email: '', address: '', phone: '' })
  
  // Client templates
  const [clientTemplates, setClientTemplates] = useState<ClientTemplate[]>([])
  const [showClientTemplateModal, setShowClientTemplateModal] = useState(false)

  const [showCreateClientModal, setShowCreateClientModal] = useState(false)

  // SubHeader actions handler
  function handleSubHeaderAction(action: string) {
    switch (action) {
      case 'add-invoice':
        resetForm()
        setSelectedFolderId(activeFolder === 'ALL' ? null : activeFolder)
        setShowCreateModal(true)
        break
      case 'add-client':
        setShowCreateClientModal(true)
        break
      default:
    }
  }

  // Listen for SubHeader actions
  useEffect(() => {
    const handleSubHeaderActionEvent = (event: CustomEvent) => {
      const action = event.detail
      switch (action) {
        case 'add-invoice':
          resetForm()
          setSelectedFolderId(activeFolder === 'ALL' ? null : activeFolder)
          setShowCreateModal(true)
          break
        case 'add-client':
          setShowCreateClientModal(true)
          break
        default:
      }
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
              total: (item.item_type === 'hourly' && item.hours && item.price_per_hour) 
                ? item.hours * item.price_per_hour 
                : (item.item_type === 'service_period' ? item.price : item.quantity * item.price)
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
        const itemsToInsert = items.map((item, index) => {
          const itemData: any = {
            invoice_id: invoiceData.id,
            description: item.description,
            period: item.period || null,
            quantity: item.quantity,
            price: item.price,
            price_per_hour: item.price_per_hour || null,
            hours: item.hours || null,
            item_type: item.item_type || 'product',
            position: index
          }
          return itemData
        })

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
      // Reload client stats after creating invoice
      if (userId) {
        // Trigger reload in InvoiceClientsPanel by updating a dependency
        window.dispatchEvent(new CustomEvent('invoice-created'))
      }
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
        const itemsToInsert = items.map((item, index) => {
          const itemData: any = {
            invoice_id: selectedInvoice.id,
            description: item.description,
            period: item.period || null,
            quantity: item.quantity,
            price: item.price,
            price_per_hour: item.price_per_hour || null,
            hours: item.hours || null,
            item_type: item.item_type || 'product',
            position: index
          }
          return itemData
        })

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert)

        if (itemsError) {
          console.error('Error updating invoice items:', itemsError)
          if (itemsError.message.includes('item_type')) {
            alert('Ошибка: колонка item_type не найдена в таблице invoice_items.\n\nПожалуйста, выполните SQL скрипт:\nscripts/create-invoice-tables.sql\n\nв Supabase Dashboard → SQL Editor')
          } else {
            alert(`Ошибка обновления позиций: ${itemsError.message}`)
          }
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
      // Reload client stats after deleting invoice
      if (userId) {
        window.dispatchEvent(new CustomEvent('invoice-deleted'))
      }
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
    setOriginalToData({ 
      name: invoice.client_name, 
      email: invoice.client_email || '', 
      address: invoice.client_address || '', 
      phone: invoice.client_phone || '' 
    })
    setToDataChanged(false)
    
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

  // Load FROM template from localStorage (one-time when modal opens)
  useEffect(() => {
    if ((showCreateModal || isEditing) && !fromDataSaved && !isEditingFrom) {
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
          setFromDataSaved(true)
        }
      } catch (error) {
        console.error('Error loading FROM template:', error)
      }
    }
  }, [showCreateModal, isEditing, fromDataSaved, isEditingFrom])

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
      setFromDataSaved(true)
      setIsEditingFrom(false)
      // Check if bank data is filled
      const hasBankData = !!(fromAccountNumber || fromBankName || fromSwiftBic)
      setBankDataFilled(hasBankData)
      // Show notification
      const notification = document.createElement('div')
      notification.textContent = 'Данные сохранены'
      notification.style.cssText = 'position: fixed; top: 100px; right: 20px; background: #059669; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'
      document.body.appendChild(notification)
      setTimeout(() => {
        notification.style.opacity = '0'
        notification.style.transition = 'opacity 0.3s'
        setTimeout(() => document.body.removeChild(notification), 300)
      }, 2000)
    } catch (error) {
      console.error('Error saving FROM template:', error)
      alert('Ошибка сохранения данных')
    }
  }
  
  // Check if bank data is filled
  useEffect(() => {
    const hasBankData = !!(fromAccountNumber || fromBankName || fromSwiftBic)
    if (fromDataSaved && !isEditingFrom) {
      setBankDataFilled(hasBankData)
    }
  }, [fromAccountNumber, fromBankName, fromSwiftBic, fromDataSaved, isEditingFrom])
  
  // Track TO data changes
  useEffect(() => {
    const hasChanged = 
      clientName !== originalToData.name ||
      clientEmail !== originalToData.email ||
      clientAddress !== originalToData.address ||
      clientPhone !== originalToData.phone
    setToDataChanged(hasChanged)
  }, [clientName, clientEmail, clientAddress, clientPhone, originalToData])
  
  // Save TO template (used in TO section)
  const saveToTemplate = async () => {
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
      setOriginalToData({ name: clientName, email: clientEmail || '', address: clientAddress || '', phone: clientPhone || '' })
      setToDataChanged(false)
      // Show notification
      const notification = document.createElement('div')
      notification.textContent = 'Клиент сохранен'
      notification.style.cssText = 'position: fixed; top: 100px; right: 20px; background: #059669; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'
      document.body.appendChild(notification)
      setTimeout(() => {
        notification.style.opacity = '0'
        notification.style.transition = 'opacity 0.3s'
        setTimeout(() => document.body.removeChild(notification), 300)
      }, 2000)
    } catch (error) {
      console.error('Error saving client template:', error)
      alert(`Ошибка сохранения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
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
    setOriginalToData({ 
      name: template.name || '', 
      email: template.email || '', 
      address: template.address || '', 
      phone: template.phone || '' 
    })
    setToDataChanged(false)
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
      // Reload client stats after creating client
      if (userId) {
        window.dispatchEvent(new CustomEvent('client-created'))
      }
      setShowClientTemplateModal(false)
      setShowCreateClientModal(false)
      // Reset client form
      setClientName('')
      setClientEmail('')
      setClientAddress('')
      setClientPhone('')
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
    setOriginalToData({ name: '', email: '', address: '', phone: '' })
    setToDataChanged(false)
    
    // Reset FROM editing state - will trigger useEffect to load template
    setFromDataSaved(false)
    setIsEditingFrom(false)
    
    // Load PDF theme
    const savedThemeId = localStorage.getItem('frovo_invoice_pdf_theme_id')
    if (savedThemeId) {
      setPdfThemeId(savedThemeId)
    }
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
    
    // If changing item_type, reset fields that don't apply to new type
    if (field === 'item_type') {
      const newType = value as ItemType
      if (newType === 'product') {
        // Reset period, hours, price_per_hour
        updatedItem.period = ''
        updatedItem.hours = 0
        updatedItem.price_per_hour = 0
        updatedItem.quantity = updatedItem.quantity || 1
      } else if (newType === 'service_period') {
        // Reset quantity, price_per_hour (keep hours optional)
        updatedItem.quantity = 1
        updatedItem.price_per_hour = 0
        // Keep period and hours
      } else if (newType === 'hourly') {
        // Reset quantity, period
        updatedItem.quantity = 1
        updatedItem.period = ''
        updatedItem.hours = updatedItem.hours || 0
        updatedItem.price_per_hour = updatedItem.price_per_hour || 0
      }
    }
    
    // Recalculate total based on item type
    const itemType = updatedItem.item_type || 'product'
    
    if (itemType === 'product') {
      // For product: total = quantity * price
      updatedItem.total = updatedItem.quantity * updatedItem.price
    } else if (itemType === 'service_period') {
      // For service period: if hours provided, use hourly rate, else use price
      if (updatedItem.hours && updatedItem.price_per_hour) {
        updatedItem.total = updatedItem.hours * updatedItem.price_per_hour
        updatedItem.price = updatedItem.total
      } else {
        updatedItem.total = updatedItem.price
      }
    } else if (itemType === 'hourly') {
      // For hourly: total = hours * price_per_hour, and price = total
      const hours = updatedItem.hours || 0
      const pricePerHour = updatedItem.price_per_hour || 0
      updatedItem.total = hours * pricePerHour
      updatedItem.price = updatedItem.total
    }
    
    newItems[index] = updatedItem
    setItems(newItems)
  }

  const { subtotal, taxAmount, total } = useMemo(() => calculateTotals(items), [items, taxRate])

  const handleExportPDF = async (invoice: Invoice) => {
    try {
      await exportInvoiceToPDF(invoice, pdfThemeColor)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert(t('invoice.exportError'))
    }
  }

  const handleThemeChange = (themeId: string) => {
    setPdfThemeId(themeId)
    localStorage.setItem('frovo_invoice_pdf_theme_id', themeId)
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
          onSelectClient={async (clientName) => {
            if (!showCreateModal && !isEditing) {
              // Reset form first
              resetForm()
              
              // Then load client template data
              const { data: clientTemplate } = await supabase
                .from('invoice_client_templates')
                .select('*')
                .eq('user_id', userId)
                .eq('name', clientName)
                .single()
              
              if (clientTemplate) {
                setClientName(clientTemplate.name || '')
                setClientEmail(clientTemplate.email || '')
                setClientAddress(clientTemplate.address || '')
                setClientPhone(clientTemplate.phone || '')
              } else {
                setClientName(clientName)
              }
              
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
        bodyClassName="p-0 !overflow-hidden invoice-modal-body"
        contentClassName="max-h-[90vh] !w-[95vw] !max-w-[1400px] invoice-create-modal !overflow-hidden"
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
        <div className="invoice-modal-split" style={{ overflow: 'hidden' }}>
          {/* Left: Form */}
          <div className="invoice-modal-form" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
            <div className="space-y-6 p-5">
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
                    value={taxRate || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value)
                      setTaxRate(Math.max(0, Math.min(100, val)))
                    }}
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Тема PDF</label>
                  <Dropdown
                    value={pdfThemeId}
                    onChange={(value) => handleThemeChange(String(value))}
                    options={pdfThemes.map(theme => ({ 
                      value: theme.id, 
                      label: theme.name 
                    }))}
                    placeholder="Выберите тему"
                  />
                </div>
              </div>

              {/* FROM Section */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">{t('invoice.from')}</h3>
                  {!isEditingFrom ? (
                    <button
                      type="button"
                      className="btn btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap"
                      onClick={() => setIsEditingFrom(true)}
                      title="Редактировать данные отправителя"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Редактировать</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn text-xs px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap bg-black text-white"
                      onClick={saveFromTemplate}
                      title="Сохранить данные"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Сохранить</span>
                    </button>
                  )}
                </div>
                <div className={`grid grid-cols-2 gap-4 ${!isEditingFrom ? 'opacity-60' : ''}`}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromName')}</label>
                    <CoreInput 
                      value={fromName} 
                      onChange={(e) => setFromName(e.target.value)} 
                      disabled={!isEditingFrom}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromCountry')}</label>
                    <CoreInput 
                      value={fromCountry} 
                      onChange={(e) => setFromCountry(e.target.value)} 
                      disabled={!isEditingFrom}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromCity')}</label>
                    <CoreInput 
                      value={fromCity} 
                      onChange={(e) => setFromCity(e.target.value)} 
                      disabled={!isEditingFrom}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromProvince')}</label>
                    <CoreInput 
                      value={fromProvince} 
                      onChange={(e) => setFromProvince(e.target.value)} 
                      disabled={!isEditingFrom}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromAddressLine1')}</label>
                    <CoreInput 
                      value={fromAddressLine1} 
                      onChange={(e) => setFromAddressLine1(e.target.value)} 
                      disabled={!isEditingFrom}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromAddressLine2')}</label>
                    <CoreInput 
                      value={fromAddressLine2} 
                      onChange={(e) => setFromAddressLine2(e.target.value)} 
                      disabled={!isEditingFrom}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromPostalCode')}</label>
                    <CoreInput 
                      value={fromPostalCode} 
                      onChange={(e) => setFromPostalCode(e.target.value)} 
                      disabled={!isEditingFrom}
                    />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Банковские данные</h4>
                  <div className={`grid grid-cols-2 gap-4 ${bankDataFilled && !isEditingFrom ? 'opacity-60' : ''}`}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromAccountNumber')}</label>
                      <CoreInput 
                        value={fromAccountNumber} 
                        onChange={(e) => setFromAccountNumber(e.target.value)} 
                        disabled={!isEditingFrom}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromRoutingNumber')}</label>
                      <CoreInput 
                        value={fromRoutingNumber} 
                        onChange={(e) => setFromRoutingNumber(e.target.value)} 
                        disabled={!isEditingFrom}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromSwiftBic')}</label>
                      <CoreInput 
                        value={fromSwiftBic} 
                        onChange={(e) => setFromSwiftBic(e.target.value)} 
                        disabled={!isEditingFrom}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromBankName')}</label>
                      <CoreInput 
                        value={fromBankName} 
                        onChange={(e) => setFromBankName(e.target.value)} 
                        disabled={!isEditingFrom}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromBankAddress')}</label>
                      <CoreTextarea 
                        value={fromBankAddress} 
                        onChange={(e) => setFromBankAddress(e.target.value)} 
                        disabled={!isEditingFrom}
                        rows={2} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* TO Section */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">{t('invoice.to')}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {clientTemplates.length > 0 && (
                      <Dropdown
                        value=""
                        onChange={(value) => {
                          const template = clientTemplates.find(t => t.id === value)
                          if (template) loadClientTemplate(template)
                        }}
                        options={clientTemplates.map(t => ({ value: t.id, label: t.name }))}
                        placeholder={t('invoice.loadClientTemplate')}
                        buttonClassName="text-xs px-3 py-1.5"
                      />
                    )}
                    {toDataChanged && (
                      <button
                        type="button"
                        className="btn text-xs px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap bg-black text-white"
                        onClick={saveToTemplate}
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Сохранить</span>
                      </button>
                    )}
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
                  <button className="btn btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5" onClick={addItem}>
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('invoice.addItem')}</span>
                  </button>
                </div>
                {items.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <Plus className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">Нет позиций</p>
                      <p className="text-xs text-gray-400">Нажмите "Добавить позицию" чтобы начать</p>
                    </div>
                  </div>
                ) : (
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
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Дата от</label>
                                  <CustomDatePicker
                                    value={item.period?.split(' - ')[0] || ''}
                                    onChange={(date) => {
                                      const currentTo = item.period?.split(' - ')[1] || ''
                                      updateItem(index, 'period', date + (currentTo ? ' - ' + currentTo : ''))
                                    }}
                                    placeholder="Дата от"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Дата до</label>
                                  <CustomDatePicker
                                    value={item.period?.split(' - ')[1] || ''}
                                    onChange={(date) => {
                                      const currentFrom = item.period?.split(' - ')[0] || ''
                                      updateItem(index, 'period', (currentFrom || '') + (currentFrom && date ? ' - ' : '') + date)
                                    }}
                                    placeholder="Дата до"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.hours')} (опционально)</label>
                                  <CoreInput
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.hours || ''}
                                    onChange={(e) => {
                                      const val = e.target.value
                                      if (val === '' || val === '-') {
                                        updateItem(index, 'hours', 0)
                                      } else {
                                        const hours = Number(val)
                                        if (!isNaN(hours) && hours >= 0) {
                                          updateItem(index, 'hours', hours)
                                        }
                                      }
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
                                          if (val === '' || val === '-') {
                                            updateItem(index, 'price_per_hour', 0)
                                          } else {
                                            const pricePerHour = Number(val)
                                            if (!isNaN(pricePerHour) && pricePerHour >= 0) {
                                              updateItem(index, 'price_per_hour', pricePerHour)
                                            }
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
                                        const val = e.target.value
                                        if (val === '' || val === '-') {
                                          updateItem(index, 'price', 0)
                                        } else {
                                          const price = Number(val)
                                          if (!isNaN(price) && price >= 0) {
                                            updateItem(index, 'price', price)
                                          }
                                        }
                                      }}
                                      placeholder={t('invoice.price')}
                                    />
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                          
                          {itemType === 'hourly' && (
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoice.hours')}</label>
                                <CoreInput
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.hours || ''}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    if (val === '' || val === '-') {
                                      updateItem(index, 'hours', 0)
                                    } else {
                                      const hours = Number(val)
                                      if (!isNaN(hours) && hours >= 0) {
                                        updateItem(index, 'hours', hours)
                                      }
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
                                  min="0"
                                  value={item.price_per_hour || ''}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    if (val === '' || val === '-') {
                                      updateItem(index, 'price_per_hour', 0)
                                    } else {
                                      const pricePerHour = Number(val)
                                      if (!isNaN(pricePerHour) && pricePerHour >= 0) {
                                        updateItem(index, 'price_per_hour', pricePerHour)
                                      }
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
                                  value={item.total || 0}
                                  readOnly
                                  className="bg-gray-100 cursor-not-allowed"
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
                  </div>
                )}
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
          <div className="invoice-modal-preview" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
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
              headerColor={pdfThemeColor}
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

      {/* Create Client Modal */}
      <UnifiedModal
        open={showCreateClientModal}
        onClose={() => {
          setShowCreateClientModal(false)
          setClientName('')
          setClientEmail('')
          setClientAddress('')
          setClientPhone('')
        }}
        title={t('invoice.newClient')}
        footer={createSimpleFooter(
          {
            label: t('actions.save'),
            onClick: saveClientTemplate,
            disabled: !clientName.trim()
          },
          {
            label: t('actions.cancel'),
            onClick: () => {
              setShowCreateClientModal(false)
              setClientName('')
              setClientEmail('')
              setClientAddress('')
              setClientPhone('')
            }
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

      {/* Client Template Modal (from form) */}
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
