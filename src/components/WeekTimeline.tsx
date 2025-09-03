import { addDays, format, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = { anchor: Date, onPrev: ()=>void, onNext: ()=>void }
export default function WeekTimeline({ anchor, onPrev, onNext }: Props){
  const start = startOfWeek(anchor, { weekStartsOn: 1 })
  const end = addDays(start, 6)
  return (
    <div className="timeline">
      <button className="nav-left btn btn-outline w-[34px] h-[34px] p-0 flex items-center justify-center week-nav" onClick={onPrev} aria-label="Предыдущая неделя">
        <ChevronLeft size={16} />
      </button>
      <div className="range">{format(start, 'd MMM', { locale: ru })} — {format(end, 'd MMM, yyyy', { locale: ru })}</div>
      <button className="nav-right btn btn-outline w-[34px] h-[34px] p-0 flex items-center justify-center week-nav" onClick={onNext} aria-label="Следующая неделя">
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
