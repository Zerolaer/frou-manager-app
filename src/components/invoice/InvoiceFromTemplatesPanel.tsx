import React, { useState, useEffect } from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { supabase } from '@/lib/supabaseClient'
import { Building2, Edit2, Trash2, Plus } from 'lucide-react'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { CoreInput, CoreTextarea } from '@/components/ui/CoreInput'

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

interface Props {
  userId: string
  onSelectTemplate?: (template: FromTemplate) => void
  onEditClient?: (template: FromTemplate) => void
}

export default function InvoiceFromTemplatesPanel({ userId, onSelectTemplate, onEditClient }: Props) {
  const { t } = useSafeTranslation()
  const { createSimpleFooter } = useModalActions()
  const [templates, setTemplates] = useState<FromTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<FromTemplate | null>(null)
  
  // Form state
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [routingNumber, setRoutingNumber] = useState('')
  const [swiftBic, setSwiftBic] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAddress, setBankAddress] = useState('')

  useEffect(() => {
    if (!userId) return
    loadTemplates()
    
    const handleEvent = () => {
      loadTemplates()
    }
    window.addEventListener('from-template-created', handleEvent)
    window.addEventListener('from-template-updated', handleEvent)
    window.addEventListener('from-template-deleted', handleEvent)
    
    return () => {
      window.removeEventListener('from-template-created', handleEvent)
      window.removeEventListener('from-template-updated', handleEvent)
      window.removeEventListener('from-template-deleted', handleEvent)
    }
  }, [userId])

  const loadTemplates = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('invoice_from_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error loading from templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setCountry('')
    setCity('')
    setProvince('')
    setAddressLine1('')
    setAddressLine2('')
    setPostalCode('')
    setAccountNumber('')
    setRoutingNumber('')
    setSwiftBic('')
    setBankName('')
    setBankAddress('')
    setEditingTemplate(null)
  }

  const handleCreate = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const handleEdit = (template: FromTemplate) => {
    setEditingTemplate(template)
    setName(template.name || '')
    setCountry(template.country || '')
    setCity(template.city || '')
    setProvince(template.province || '')
    setAddressLine1(template.address_line1 || '')
    setAddressLine2(template.address_line2 || '')
    setPostalCode(template.postal_code || '')
    setAccountNumber(template.account_number || '')
    setRoutingNumber(template.routing_number || '')
    setSwiftBic(template.swift_bic || '')
    setBankName(template.bank_name || '')
    setBankAddress(template.bank_address || '')
    setShowEditModal(true)
  }

  const handleSave = async () => {
    if (!userId || !name.trim()) {
      alert((t('invoice.fromName') || 'Имя') + ' ' + (t('common.required') || 'обязательно'))
      return
    }

    try {
      const templateData = {
        name: name.trim(),
        country: country.trim() || null,
        city: city.trim() || null,
        province: province.trim() || null,
        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        postal_code: postalCode.trim() || null,
        account_number: accountNumber.trim() || null,
        routing_number: routingNumber.trim() || null,
        swift_bic: swiftBic.trim() || null,
        bank_name: bankName.trim() || null,
        bank_address: bankAddress.trim() || null,
      }

      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('invoice_from_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)
          .eq('user_id', userId)
        
        if (error) throw error
        window.dispatchEvent(new CustomEvent('from-template-updated'))
      } else {
        // Create new template
        const { error } = await supabase
          .from('invoice_from_templates')
          .insert({
            user_id: userId,
            ...templateData
          })
        
        if (error) throw error
        window.dispatchEvent(new CustomEvent('from-template-created'))
      }

      setShowCreateModal(false)
      setShowEditModal(false)
      resetForm()
      loadTemplates()
    } catch (error) {
      console.error('Error saving from template:', error)
      alert(`Ошибка сохранения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  const handleDelete = async (template: FromTemplate) => {
    if (!confirm(t('invoice.confirmDelete') || 'Вы уверены, что хотите удалить этот шаблон?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('invoice_from_templates')
        .delete()
        .eq('id', template.id)
        .eq('user_id', userId)
      
      if (error) throw error
      window.dispatchEvent(new CustomEvent('from-template-deleted'))
      loadTemplates()
    } catch (error) {
      console.error('Error deleting from template:', error)
      alert(`Ошибка удаления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  if (loading) {
    return (
      <div className="invoice-clients-panel">
        <div className="text-sm text-gray-500 p-4">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <>
      <div className="invoice-clients-panel">
        <div className="invoice-clients-header">
          <h3 className="invoice-clients-title">
            <Building2 className="w-5 h-5" />
            {t('invoice.fromTemplate') || 'Мои данные'}
          </h3>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              {templates.length} {templates.length === 1 ? 'шаблон' : 'шаблонов'}
            </div>
            <button
              onClick={handleCreate}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
              title={t('invoice.newFromTemplate') || 'Создать шаблон отправителя'}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="invoice-clients-list">
          {templates.length === 0 ? (
            <div className="invoice-clients-empty">
              <Building2 className="w-8 h-8 text-gray-300 mb-2" />
              <div className="text-sm text-gray-500">{t('invoice.noFromTemplates') || 'Нет шаблонов отправителя'}</div>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="invoice-client-card"
              >
                <div 
                  className="invoice-client-header"
                  onClick={() => onSelectTemplate?.(template)}
                >
                  <div className="invoice-client-name">{template.name}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onEditClient) {
                          onEditClient(template)
                        } else {
                          handleEdit(template)
                        }
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                      title={t('actions.edit') || 'Редактировать'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(template)
                      }}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                      title={t('invoice.deleteClientTemplate') || 'Удалить'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {(template.city || template.country) && (
                  <div 
                    className="invoice-client-contact"
                    onClick={() => onSelectTemplate?.(template)}
                  >
                    <span className="text-xs text-gray-500">
                      {[template.city, template.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      <UnifiedModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetForm()
        }}
        title={t('invoice.newFromTemplate') || 'Новый шаблон отправителя'}
        footer={createSimpleFooter(
          {
            label: t('actions.save'),
            onClick: handleSave,
            disabled: !name.trim()
          },
          {
            label: t('actions.cancel'),
            onClick: () => {
              setShowCreateModal(false)
              resetForm()
            }
          }
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('invoice.fromName')} *
            </label>
            <CoreInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('invoice.fromNamePlaceholder') || 'Например: ИП Иванов И.И.'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromCountry')}</label>
              <CoreInput
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={t('invoice.fromCountry')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromCity')}</label>
              <CoreInput
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('invoice.fromCity')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromProvince')}</label>
            <CoreInput
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder={t('invoice.fromProvince')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromAddressLine1')}</label>
            <CoreInput
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder={t('invoice.fromAddressLine1')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromAddressLine2')}</label>
            <CoreInput
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder={t('invoice.fromAddressLine2')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromPostalCode')}</label>
            <CoreInput
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder={t('invoice.fromPostalCode')}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">{t('invoice.bankDetails') || 'Банковские реквизиты'}</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromAccountNumber')}</label>
              <CoreInput
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={t('invoice.fromAccountNumber')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromRoutingNumber')}</label>
                <CoreInput
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  placeholder={t('invoice.fromRoutingNumber')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromSwiftBic')}</label>
                <CoreInput
                  value={swiftBic}
                  onChange={(e) => setSwiftBic(e.target.value)}
                  placeholder={t('invoice.fromSwiftBic')}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromBankName')}</label>
              <CoreInput
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder={t('invoice.fromBankName')}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromBankAddress')}</label>
              <CoreTextarea
                value={bankAddress}
                onChange={(e) => setBankAddress(e.target.value)}
                placeholder={t('invoice.fromBankAddress')}
                rows={2}
              />
            </div>
          </div>
        </div>
      </UnifiedModal>

      {/* Edit Modal */}
      <UnifiedModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          resetForm()
        }}
        title={t('invoice.editFromTemplate') || 'Редактировать шаблон отправителя'}
        footer={createSimpleFooter(
          {
            label: t('actions.save'),
            onClick: handleSave,
            disabled: !name.trim()
          },
          {
            label: t('actions.cancel'),
            onClick: () => {
              setShowEditModal(false)
              resetForm()
            }
          }
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('invoice.fromName')} *
            </label>
            <CoreInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('invoice.fromNamePlaceholder') || 'Например: ИП Иванов И.И.'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromCountry')}</label>
              <CoreInput
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={t('invoice.fromCountry')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromCity')}</label>
              <CoreInput
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('invoice.fromCity')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromProvince')}</label>
            <CoreInput
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder={t('invoice.fromProvince')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromAddressLine1')}</label>
            <CoreInput
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder={t('invoice.fromAddressLine1')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromAddressLine2')}</label>
            <CoreInput
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder={t('invoice.fromAddressLine2')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromPostalCode')}</label>
            <CoreInput
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder={t('invoice.fromPostalCode')}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">{t('invoice.bankDetails') || 'Банковские реквизиты'}</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromAccountNumber')}</label>
              <CoreInput
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={t('invoice.fromAccountNumber')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromRoutingNumber')}</label>
                <CoreInput
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  placeholder={t('invoice.fromRoutingNumber')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromSwiftBic')}</label>
                <CoreInput
                  value={swiftBic}
                  onChange={(e) => setSwiftBic(e.target.value)}
                  placeholder={t('invoice.fromSwiftBic')}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromBankName')}</label>
              <CoreInput
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder={t('invoice.fromBankName')}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoice.fromBankAddress')}</label>
              <CoreTextarea
                value={bankAddress}
                onChange={(e) => setBankAddress(e.target.value)}
                placeholder={t('invoice.fromBankAddress')}
                rows={2}
              />
            </div>
          </div>
        </div>
      </UnifiedModal>
    </>
  )
}

