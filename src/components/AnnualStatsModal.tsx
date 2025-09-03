
import Modal from './Modal'

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

  return (
    <Modal open={open} onClose={onClose} title={`Годовая статистика — ${year}`} size="lg"
      footer={<button className="btn btn-outline" onClick={onClose}>Закрыть</button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="border rounded-xl p-3">
          <div className="text-xs text-gray-500 mb-1">Доходы</div>
          <div className="text-lg font-semibold">{totalIncome}</div>
        </div>
        <div className="border rounded-xl p-3">
          <div className="text-xs text-gray-500 mb-1">Расходы</div>
          <div className="text-lg font-semibold">{totalExpense}</div>
        </div>
        <div className="border rounded-xl p-3">
          <div className="text-xs text-gray-500 mb-1">Баланс</div>
          <div className="text-lg font-semibold">{balance}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-medium mb-2">Доходы по месяцам</div>
          <div className="space-y-2">
            {incomeByMonth.map((v,i)=>(
              <div key={i} className="flex items-center gap-2">
                <div className="w-10 text-xs text-gray-500">{months[i]}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded">
                  <div className="h-2 rounded bg-blue-500" style={{ width: `${(v/maxBar)*100}%` }} />
                </div>
                <div className="w-14 text-right text-xs">{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium mb-2">Расходы по месяцам</div>
          <div className="space-y-2">
            {expenseByMonth.map((v,i)=>(
              <div key={i} className="flex items-center gap-2">
                <div className="w-10 text-xs text-gray-500">{months[i]}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded">
                  <div className="h-2 rounded bg-red-500" style={{ width: `${(v/maxBar)*100}%` }} />
                </div>
                <div className="w-14 text-right text-xs">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
