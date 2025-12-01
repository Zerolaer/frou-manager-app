import React, { useState, useEffect } from 'react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { supabase } from '@/lib/supabaseClient'
import { formatCurrencyEUR } from '@/lib/format'
import { User, DollarSign, FileText, TrendingUp } from 'lucide-react'

interface ClientStats {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  totalInvoices: number
  totalAmount: number
  lastInvoiceDate?: string
}

interface Props {
  userId: string
  onSelectClient?: (clientName: string) => void
}

export default function InvoiceClientsPanel({ userId, onSelectClient }: Props) {
  const { t } = useSafeTranslation()
  const [clients, setClients] = useState<ClientStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    loadClientStats()
    
    // Listen for invoice and client create/delete events to reload stats
    const handleEvent = () => {
      loadClientStats()
    }
    window.addEventListener('invoice-created', handleEvent)
    window.addEventListener('invoice-deleted', handleEvent)
    window.addEventListener('client-created', handleEvent)
    
    return () => {
      window.removeEventListener('invoice-created', handleEvent)
      window.removeEventListener('invoice-deleted', handleEvent)
      window.removeEventListener('client-created', handleEvent)
    }
  }, [userId])

  const loadClientStats = async () => {
    if (!userId) return
    setLoading(true)
    try {
      // Загружаем клиентов из invoice_client_templates
      const { data: clientTemplates, error: templatesError } = await supabase
        .from('invoice_client_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (templatesError) throw templatesError

      // Загружаем все инвойсы для подсчета статистики
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, client_name, total, date')
        .eq('user_id', userId)

      if (invoicesError) throw invoicesError

      // Создаем мапу для подсчета статистики по клиентам
      const invoiceStats = new Map<string, { count: number; total: number; lastDate?: string }>()
      
      invoices?.forEach((invoice) => {
        const clientName = invoice.client_name
        if (!invoiceStats.has(clientName)) {
          invoiceStats.set(clientName, { count: 0, total: 0 })
        }
        const stats = invoiceStats.get(clientName)!
        stats.count += 1
        stats.total += Number(invoice.total || 0)
        if (!stats.lastDate || new Date(invoice.date) > new Date(stats.lastDate)) {
          stats.lastDate = invoice.date
        }
      })

      // Объединяем клиентов из шаблонов со статистикой
      const clientsWithStats: ClientStats[] = (clientTemplates || []).map(template => {
        const stats = invoiceStats.get(template.name) || { count: 0, total: 0, lastDate: undefined }
        return {
          id: template.id,
          name: template.name,
          email: template.email || undefined,
          phone: template.phone || undefined,
          address: template.address || undefined,
          totalInvoices: stats.count,
          totalAmount: stats.total,
          lastInvoiceDate: stats.lastDate
        }
      })

      // Сортируем по общей сумме (убывание)
      const sortedClients = clientsWithStats.sort((a, b) => b.totalAmount - a.totalAmount)
      setClients(sortedClients)
    } catch (error) {
      console.error('Error loading client stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="invoice-clients-panel">
        <div className="text-center py-8 text-gray-500">
          {t('common.loading')}
        </div>
      </div>
    )
  }

  return (
    <div className="invoice-clients-panel">
      <div className="invoice-clients-header">
        <h3 className="invoice-clients-title">
          <User className="w-5 h-5" />
          {t('invoice.clients')}
        </h3>
        <div className="text-xs text-gray-500">
          {clients.length} {t('invoice.clientsCount')}
        </div>
      </div>

      <div className="invoice-clients-list">
        {clients.length === 0 ? (
          <div className="invoice-clients-empty">
            <User className="w-8 h-8 text-gray-300 mb-2" />
            <div className="text-sm text-gray-500">{t('invoice.noClients')}</div>
          </div>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="invoice-client-card"
              onClick={() => onSelectClient?.(client.name)}
            >
              <div className="invoice-client-header">
                <div className="invoice-client-name">{client.name}</div>
                <div className="invoice-client-amount">
                  {formatCurrencyEUR(client.totalAmount)}
                </div>
              </div>
              
              <div className="invoice-client-stats">
                <div className="invoice-client-stat">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span>{client.totalInvoices} {t('invoice.invoices')}</span>
                </div>
                <div className="invoice-client-stat">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span>{formatDate(client.lastInvoiceDate)}</span>
                </div>
              </div>

              {client.email && (
                <div className="invoice-client-contact">
                  <span className="text-xs text-gray-500">{client.email}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

