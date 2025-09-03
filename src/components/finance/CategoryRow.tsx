
import React from 'react'
import { MoreVertical } from 'lucide-react'
import type { Cat, CtxCat, CellCtx, MoneyType } from '@/features/finance/types'

type Props = {
  type: MoneyType
  row: Pick<Cat, 'id' | 'name' | 'parent_id'>
  values: number[]
  isCurrentYear: boolean
  currentMonth: number
  hasChildren: boolean
  collapsed: boolean
  onToggleCollapse: (id: string) => void
  onNameContext: (e: React.MouseEvent, info: CtxCat) => void
  onCellContext: (e: React.MouseEvent, type: MoneyType, id: string, monthIndex: number, value: number) => void
  onCellEdit: (type: MoneyType, id: string, monthIndex: number) => void
  fmt: (n: number) => string
  ctxCatHighlight: string | null
  ctxCellHighlight: CellCtx | null
}

export default function CategoryRow({
  type,
  row,
  values,
  isCurrentYear,
  currentMonth,
  hasChildren,
  collapsed,
  onToggleCollapse,
  onNameContext,
  onCellContext,
  onCellEdit,
  fmt,
  ctxCatHighlight,
  ctxCellHighlight,
}: Props) {
  const info: CtxCat = { id: row.id, name: row.name, type }

  return (
    <div className="finance-row contents">
      <div className={'finance-cell ' + (ctxCatHighlight === row.id ? 'ctx-active' : '')}>
        <div className="cell-head flex items-center gap-2">
          <button
            className="w-6 h-6 rounded border flex items-center justify-center hover:bg-gray-100"
            onClick={() => onToggleCollapse(row.id)}
            title={hasChildren ? (collapsed ? 'Развернуть' : 'Свернуть') : 'Категория'}
          >
            {hasChildren ? (collapsed ? '▸' : '▾') : '•'}
          </button>
        )}
          <span className="flex-1 truncate">{row.name}</span>
          {row.parent_id && (
          <button
            className="icon-btn opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => onNameContext(e, info)}
            onContextMenu={(e) => onNameContext(e, info)}
            aria-label="Действия с категорией"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {values.map((v, mi) => (
        <div
          key={mi}
          className={
            'finance-cell ' +
            (isCurrentYear && mi === currentMonth ? 'col-current ' : '') +
            (ctxCellHighlight && ctxCellHighlight.type === type && ctxCellHighlight.catId === row.id && ctxCellHighlight.month === mi ? 'ctx-active' : '')
          }
          onContextMenu={(e) => onCellContext(e, type, row.id, mi, v)}
        >
          <button className="cell-btn" onClick={() => onCellEdit(type, row.id, mi)}>
            {fmt(v)}
          </button>
        </div>
      ))}
    </div>
  )
}
