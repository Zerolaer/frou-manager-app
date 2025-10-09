
import { UnifiedModal, ModalButton, ModalFooter } from '@/components/ui/ModalSystem'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  year: number
  incomeByMonth: number[]
  expenseByMonth: number[]
}

export default function AnnualStatsModal({ open, onClose, year, incomeByMonth, expenseByMonth }: Props){
  const { t } = useTranslation()
  
  // Translated months array
  const months = useMemo(() => [
    t('finance.months.jan'),
    t('finance.months.feb'),
    t('finance.months.mar'),
    t('finance.months.apr'),
    t('finance.months.may'),
    t('finance.months.jun'),
    t('finance.months.jul'),
    t('finance.months.aug'),
    t('finance.months.sep'),
    t('finance.months.oct'),
    t('finance.months.nov'),
    t('finance.months.dec')
  ], [t])
  
  const totalIncome = incomeByMonth.reduce((s,v)=>s+v,0)
  const totalExpense = expenseByMonth.reduce((s,v)=>s+v,0)
  const balance = totalIncome - totalExpense
  const maxBar = Math.max(...incomeByMonth, ...expenseByMonth, 1)
  
  // New metrics
  const avgIncome = totalIncome / 12
  const avgExpense = totalExpense / 12
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
  
  // Best months
  const bestIncomeMonth = incomeByMonth.indexOf(Math.max(...incomeByMonth))
  const bestExpenseMonth = expenseByMonth.indexOf(Math.max(...expenseByMonth))
  
  // Balance by months for trend
  const balanceByMonth = incomeByMonth.map((income, i) => income - expenseByMonth[i])
  
  // Format with euro symbol and 2 decimal places
  const formatEUR = (value: number) => `€${value.toFixed(2)}`
  const formatPercent = (value: number) => `${value.toFixed(1)}%`

  return (
    <UnifiedModal 
      open={open} 
      onClose={onClose} 
      title={`${t('finance.annualStats')} — ${year}`} 
      size="lg"
      variant="side"
      footer={
        <ModalFooter
          right={
            <ModalButton variant="secondary" onClick={onClose}>
              {t('actions.close')}
            </ModalButton>
          }
        />
      }
    >
      {/* Main metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">{t('finance.income')}</div>
          <div className="text-lg font-semibold">{formatEUR(totalIncome)}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">{t('finance.expenses')}</div>
          <div className="text-lg font-semibold">{formatEUR(totalExpense)}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">{t('finance.balance')}</div>
          <div className="text-lg font-semibold">{formatEUR(balance)}</div>
        </div>
      </div>

      {/* Average values and coefficients */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">{t('finance.stats.avgIncome')}</div>
          <div className="text-base font-medium">{formatEUR(avgIncome)}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">{t('finance.stats.avgExpense')}</div>
          <div className="text-base font-medium">{formatEUR(avgExpense)}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">{t('finance.stats.savingsRate')}</div>
          <div className="text-base font-medium">{formatPercent(savingsRate)}</div>
        </div>
      </div>

      {/* Best months */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">{t('finance.stats.bestIncomeMonth')}</div>
          <div className="text-base font-medium">{months[bestIncomeMonth]} · {formatEUR(incomeByMonth[bestIncomeMonth])}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">{t('finance.stats.highestExpenseMonth')}</div>
          <div className="text-base font-medium">{months[bestExpenseMonth]} · {formatEUR(expenseByMonth[bestExpenseMonth])}</div>
        </div>
      </div>

      {/* Balance trend chart */}
      <div className="border rounded-xl p-4 bg-white mb-6">
        <div className="text-sm font-medium mb-3">{t('finance.stats.balanceTrend')}</div>
        <div className="space-y-2">
          {balanceByMonth.map((balance, i) => {
            const isPositive = balance >= 0
            const maxBalance = Math.max(...balanceByMonth.map(Math.abs))
            const width = maxBalance > 0 ? (Math.abs(balance) / maxBalance) * 100 : 0
            
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="w-10 text-xs text-gray-500">{months[i]}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded relative">
                  <div 
                    className={`h-2 rounded ${isPositive ? 'bg-gray-800' : 'bg-gray-400'}`} 
                    style={{ width: `${width}%` }}
                  />
                </div>
                <div className="w-20 text-right text-xs">{formatEUR(balance)}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-sm font-medium mb-3">{t('finance.stats.incomeByMonths')}</div>
          <div className="space-y-2">
            {incomeByMonth.map((v,i)=>(
              <div key={i} className="flex items-center gap-2">
                <div className="w-10 text-xs text-gray-500">{months[i]}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded">
                  <div className="h-2 rounded bg-gray-800" style={{ width: `${(v/maxBar)*100}%` }} />
                </div>
                <div className="w-20 text-right text-xs">{formatEUR(v)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-sm font-medium mb-3">{t('finance.stats.expensesByMonths')}</div>
          <div className="space-y-2">
            {expenseByMonth.map((v,i)=>(
              <div key={i} className="flex items-center gap-2">
                <div className="w-10 text-xs text-gray-500">{months[i]}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded">
                  <div className="h-2 rounded bg-gray-600" style={{ width: `${(v/maxBar)*100}%` }} />
                </div>
                <div className="w-20 text-right text-xs">{formatEUR(v)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </UnifiedModal>
  )
}
