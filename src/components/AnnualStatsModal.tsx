
import { UnifiedModal, ModalButton, ModalFooter } from '@/components/ui/ModalSystem'

type Props = {
  open: boolean
  onClose: () => void
  year: number
  incomeByMonth: number[]
  expenseByMonth: number[]
}

const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'] as const

export default function AnnualStatsModal({ open, onClose, year, incomeByMonth, expenseByMonth }: Props){
  const totalIncome = incomeByMonth.reduce((s,v)=>s+v,0)
  const totalExpense = expenseByMonth.reduce((s,v)=>s+v,0)
  const balance = totalIncome - totalExpense
  const maxBar = Math.max(...incomeByMonth, ...expenseByMonth, 1)
  
  // Новые метрики
  const avgIncome = totalIncome / 12
  const avgExpense = totalExpense / 12
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
  
  // Лучшие месяцы
  const bestIncomeMonth = incomeByMonth.indexOf(Math.max(...incomeByMonth))
  const bestExpenseMonth = expenseByMonth.indexOf(Math.max(...expenseByMonth))
  
  // Баланс по месяцам для тренда
  const balanceByMonth = incomeByMonth.map((income, i) => income - expenseByMonth[i])
  
  // Форматирование с символом евро и 2 знака после запятой
  const formatEUR = (value: number) => `€${value.toFixed(2)}`
  const formatPercent = (value: number) => `${value.toFixed(1)}%`

  return (
    <UnifiedModal 
      open={open} 
      onClose={onClose} 
      title={`Годовая статистика — ${year}`} 
      size="lg"
      variant="side"
      footer={
        <ModalFooter
          right={
            <ModalButton variant="secondary" onClick={onClose}>
              Закрыть
            </ModalButton>
          }
        />
      }
    >
      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">Доходы</div>
          <div className="text-lg font-semibold">{formatEUR(totalIncome)}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">Расходы</div>
          <div className="text-lg font-semibold">{formatEUR(totalExpense)}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">Баланс</div>
          <div className="text-lg font-semibold">{formatEUR(balance)}</div>
        </div>
      </div>

      {/* Средние значения и коэффициенты */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">Средний доход</div>
          <div className="text-base font-medium">{formatEUR(avgIncome)}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">Средний расход</div>
          <div className="text-base font-medium">{formatEUR(avgExpense)}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">Коэффициент сбережений</div>
          <div className="text-base font-medium">{formatPercent(savingsRate)}</div>
        </div>
      </div>

      {/* Лучшие месяцы */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">Лучший месяц по доходам</div>
          <div className="text-base font-medium">{months[bestIncomeMonth]} · {formatEUR(incomeByMonth[bestIncomeMonth])}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 mb-1">Месяц с наибольшими расходами</div>
          <div className="text-base font-medium">{months[bestExpenseMonth]} · {formatEUR(expenseByMonth[bestExpenseMonth])}</div>
        </div>
      </div>

      {/* График тренда баланса */}
      <div className="border rounded-xl p-4 bg-white mb-6">
        <div className="text-sm font-medium mb-3">Тренд баланса по месяцам</div>
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
          <div className="text-sm font-medium mb-3">Доходы по месяцам</div>
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
          <div className="text-sm font-medium mb-3">Расходы по месяцам</div>
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
