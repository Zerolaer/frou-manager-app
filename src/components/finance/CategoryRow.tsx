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

  const info: CtxCat = { id: row.id, name: row.name, type, parent_id: row.parent_id ?? null } as unknown as CtxCat
  const isChild = !!row.parent_id

  return (
    <div className="finance-row contents">
      {/* Левая ячейка: зарезервировать место под кнопку (24px) + зазор (8px) для ВСЕХ строк,
          а для саб-категорий добавить дополнительный отступ 36px */}
      <div className="finance-cell">
        <div
          className={
            'cell-head group flex items-center ' +
            (ctxCatHighlight === row.id ? 'ctx-active ' : '')
          }
          onContextMenu={(e) => onNameContext(e, info)}
        >
          {/* Кнопка/заглушка фиксированной ширины 24px + зазор 8px */}
          {hasChildren ? (
            <button
              className="w-6 h-6 mr-2 rounded border flex items-center justify-center hover:bg-gray-100"
              onClick={() => onToggleCollapse(row.id)}
              aria-label={collapsed ? 'Развернуть' : 'Свернуть'}
            >
              <span aria-hidden>{collapsed ? '▸' : '▾'}</span>
            </button>
          ) : (
            <div className="w-6 h-6 mr-2" aria-hidden />
          )}

          {/* Название. Для саб-категорий даём +36px отступ (pl-9) */}
          <span className={'flex-1 truncate ' + (isChild ? 'pl-9 ' : '')}>{row.name}</span>

          {/* Три точки: на всех категориях, только по ховеру */}
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

      {/* Значения по месяцам */}
      {values.map((v, mi) => {
        const isActive =
          !!ctxCellHighlight &&
          (ctxCellHighlight as any).type === type &&
          (ctxCellHighlight as any).catId === row.id &&
          (ctxCellHighlight as any).month === mi

        return (
          <div
            key={mi}
            className={
              'finance-cell ' +
              (isCurrentYear && mi === currentMonth ? 'col-current ' : '') +
              (isActive ? 'ctx-active' : '')
            }
            onContextMenu={(e) => onCellContext(e, type, row.id, mi, v)}
          >
            <button className="cell-btn" onClick={() => onCellEdit(type, row.id, mi)}>
              {fmt(v)}
            </button>
          </div>
        )
      })}
    </div>
  )
}
