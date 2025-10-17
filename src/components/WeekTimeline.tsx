import { addDays, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'

type Props = { anchor: Date, onPrev: ()=>void, onNext: ()=>void }
export default function WeekTimeline({ anchor, onPrev, onNext }: Props){
  const { t } = useSafeTranslation()
  const start = startOfWeek(anchor, { weekStartsOn: 1 })
  const end = addDays(start, 6)
  
  // Month abbreviations mapping
  const monthAbbr = [
    t('tasks.months.jan'), t('tasks.months.feb'), t('tasks.months.mar'),
    t('tasks.months.apr'), t('tasks.months.may'), t('tasks.months.jun'),
    t('tasks.months.jul'), t('tasks.months.aug'), t('tasks.months.sep'),
    t('tasks.months.oct'), t('tasks.months.nov'), t('tasks.months.dec')
  ]
  
  const formatDate = (date: Date) => {
    const day = date.getDate()
    const month = monthAbbr[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month}`
  }
  
  return (
    <div className="timeline">
      <button className="nav-left sidebar-btn btn-outline" onClick={onPrev} aria-label="Предыдущая неделя">
        <ChevronLeft size={16} />
      </button>
      <div className="range">{formatDate(start)} — {formatDate(end)}, {end.getFullYear()}</div>
      <button className="nav-right sidebar-btn btn-outline" onClick={onNext} aria-label="Следующая неделя">
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
