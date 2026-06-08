import { addDays, format, isSameDay, isToday, startOfWeek } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import i18n from '@/lib/i18n'
import { cn } from '@/lib/utils'

type Props = {
  selected: Date
  onSelect: (date: Date) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  taskCounts?: Record<string, number>
  className?: string
}

export default function MobileWeekStrip({
  selected,
  onSelect,
  onPrevWeek,
  onNextWeek,
  taskCounts = {},
  className,
}: Props) {
  const { t } = useSafeTranslation()
  const locale = i18n.language?.startsWith('ru') ? ru : enUS
  const weekStart = startOfWeek(selected, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const dayLabels = [
    t('dashboard.days.MON'),
    t('dashboard.days.TUE'),
    t('dashboard.days.WED'),
    t('dashboard.days.THU'),
    t('dashboard.days.FRI'),
    t('dashboard.days.SAT'),
    t('dashboard.days.SUN'),
  ]

  const navBtnClass =
    'flex h-9 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 active:bg-secondary'

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-xl border border-outline bg-background-card p-1.5 shadow-sm',
        className
      )}
    >
      <button
        type="button"
        onClick={onPrevWeek}
        className={navBtnClass}
        aria-label={t('aria.previousDay')}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="grid min-w-0 flex-1 grid-cols-7 gap-0.5">
        {days.map((day, index) => {
          const key = format(day, 'yyyy-MM-dd')
          const isSelected = isSameDay(day, selected)
          const isTodayDay = isToday(day)
          const count = taskCounts[key] || 0

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 min-h-[2.75rem]',
                'transition-all duration-200 active:scale-[0.97]',
                isSelected && 'bg-primary text-primary-foreground shadow-sm',
                !isSelected && isTodayDay && 'bg-secondary text-primary',
                !isSelected && !isTodayDay && 'text-gray-500'
              )}
              aria-pressed={isSelected}
              aria-label={format(day, 'd MMMM yyyy', { locale })}
            >
              <span
                className={cn(
                  'text-[9px] font-semibold uppercase tracking-wide leading-none',
                  isSelected ? 'text-white/80' : 'text-gray-400'
                )}
              >
                {dayLabels[index]}
              </span>
              <span className="text-sm font-bold tabular-nums leading-none">
                {format(day, 'd')}
              </span>
              <span
                className={cn(
                  'h-1 w-1 rounded-full',
                  count > 0
                    ? isSelected
                      ? 'bg-white'
                      : 'bg-primary'
                    : 'bg-transparent'
                )}
                aria-hidden
              />
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onNextWeek}
        className={navBtnClass}
        aria-label={t('aria.nextDay')}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}
