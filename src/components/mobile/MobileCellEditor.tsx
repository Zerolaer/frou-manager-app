import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { supabase } from '@/lib/supabaseClient'
import MobileModal from '@/components/ui/MobileModal'
import { ModalButton } from '@/components/ui/ModalSystem'
import { useEnhancedErrorHandler } from '@/lib/enhancedErrorHandler'
import { FINANCE_TYPES, MONTHS_IN_YEAR } from '@/lib/constants'

type Props = {
  open: boolean
  onClose: () => void
  userId: string
  categoryId: string
  categoryName: string
  monthIndex: number
  year: number
  onApply: (sum: number) => void
}

export default function MobileCellEditor({ 
  open, 
  onClose, 
  userId, 
  categoryId, 
  categoryName, 
  monthIndex, 
  year, 
  onApply 
}: Props) {
  const { t } = useSafeTranslation()
  const { handleError } = useEnhancedErrorHandler()
  const [sum, setSum] = useState(0)
  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState<any[]>([])

  const monthNames = [
    t('finance.months.jan'), t('finance.months.feb'), t('finance.months.mar'),
    t('finance.months.apr'), t('finance.months.may'), t('finance.months.jun'),
    t('finance.months.jul'), t('finance.months.aug'), t('finance.months.sep'),
    t('finance.months.oct'), t('finance.months.nov'), t('finance.months.dec')
  ]

  useEffect(() => {
    if (open) {
      loadEntries()
    }
  }, [open, categoryId, monthIndex, year])

  const loadEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('finance_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .eq('month', monthIndex + 1)
        .eq('year', year)
        .order('created_at', { ascending: false })

      if (error) throw error

      setEntries(data || [])
      const total = (data || []).reduce((acc, entry) => acc + (Number(entry.amount) || 0), 0)
      setSum(total)
    } catch (error) {
      handleError(error, 'Loading finance entries')
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Calculate difference
      const currentTotal = entries.reduce((acc, entry) => acc + (Number(entry.amount) || 0), 0)
      const difference = sum - currentTotal

      if (difference !== 0) {
        // Create new entry for the difference
        const { error } = await supabase
          .from('finance_entries')
          .insert({
            user_id: userId,
            category_id: categoryId,
            month: monthIndex + 1,
            year,
            amount: difference,
            included: true,
            description: difference > 0 ? t('finance.incomeEntry') : t('finance.expenseEntry')
          })

        if (error) throw error
      }

      onApply(sum)
      onClose()
    } catch (error) {
      handleError(error, 'Saving finance entry')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'EUR', 
      maximumFractionDigits: 0 
    }).format(amount)
  }

  return (
    <MobileModal
      open={open}
      onClose={onClose}
      title={`${categoryName} - ${monthNames[monthIndex]} ${year}`}
      footer={
        <div className="flex gap-3 p-4">
          <ModalButton
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            {t('actions.cancel')}
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleSave}
            loading={loading}
            className="flex-1"
          >
            {t('actions.save')}
          </ModalButton>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        {/* Current Total */}
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-2">{t('finance.total')}</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(sum)}</div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('finance.amount')}
          </label>
          <input
            type="number"
            value={sum || ''}
            onChange={(e) => setSum(Number(e.target.value) || 0)}
            placeholder="0"
            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Recent Entries */}
        {entries.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-3">
              {t('finance.recentEntries')}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {entries.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-900">
                      {entry.description || t('finance.entry')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${
                    Number(entry.amount) >= 0 ? 'text-gray-900' : 'text-red-600'
                  }`}>
                    {formatCurrency(Number(entry.amount))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileModal>
  )
}
