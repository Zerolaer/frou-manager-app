import { ChevronRight, CornerDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Cat } from '@/types/shared'

type Props = {
  category: Cat
  amount: number
  hasChildren: boolean
  collapsed: boolean
  formatCurrency: (n: number) => string
  collapseLabel: string
  expandLabel: string
  canEdit: boolean
  onOpenCell: () => void
  onToggleCollapse: () => void
}

export default function MobileFinanceCategoryRow({
  category,
  amount,
  hasChildren,
  collapsed,
  formatCurrency,
  collapseLabel,
  expandLabel,
  canEdit,
  onOpenCell,
  onToggleCollapse,
}: Props) {
  const isSubcategory = !!category.parent_id
  const hasValue = amount !== 0

  function handleOpen() {
    if (hasChildren) onToggleCollapse()
    else if (canEdit) onOpenCell()
  }

  return (
    <div
      className={cn(
        'finance-mobile-cat',
        isSubcategory && 'finance-mobile-cat--child',
        hasChildren && collapsed && 'is-collapsed'
      )}
    >
      <div className="flex items-center">
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleCollapse()
            }}
            className="finance-mobile-collapse-btn ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white"
            aria-label={collapsed ? expandLabel : collapseLabel}
            aria-expanded={!collapsed}
          >
            <ChevronRight
              size={18}
              className={cn(
                'finance-mobile-collapse-icon text-gray-600 transition-transform duration-200',
                collapsed ? 'rotate-0' : 'rotate-90'
              )}
              strokeWidth={2.25}
            />
          </button>
        ) : isSubcategory ? (
          <div className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center text-gray-300">
            <CornerDownRight className="h-4 w-4" />
          </div>
        ) : null}

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-3.5 text-left"
          onClick={handleOpen}
        >
          <div
            className={cn(
              'min-w-0 flex-1 truncate',
              isSubcategory ? 'text-sm text-gray-800' : 'text-sm font-semibold text-gray-900'
            )}
          >
            {category.name}
          </div>
          <span
            className={cn(
              'shrink-0 text-sm font-semibold tabular-nums',
              hasValue ? 'text-gray-900' : 'text-gray-400'
            )}
          >
            {hasValue ? formatCurrency(amount) : '—'}
          </span>
        </button>
      </div>
    </div>
  )
}
