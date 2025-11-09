
import React from 'react'
import { MoreVertical, ChevronDown, ChevronRight, CornerDownRight } from 'lucide-react'
import type { Cat, CtxCat, CellCtx, MoneyType } from '@/features/finance/types'

type Props = {
  type: MoneyType
  row: Pick<Cat, 'id' | 'name' | 'parent_id' | 'isCollapsed'>
  values: number[]
  isCurrentYear: boolean
  currentMonth: number
  hasChildren: boolean
  collapsed: boolean
  childIndex: number
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
  childIndex,
  onToggleCollapse,
  onNameContext,
  onCellContext,
  onCellEdit,
  fmt,
  ctxCatHighlight,
  ctxCellHighlight,
}: Props) {
  const info: CtxCat = { id: row.id, name: row.name, type }
  
  // For children rows, use accordion animation
  const isChild = !!row.parent_id
  const [shouldRender, setShouldRender] = React.useState(!(isChild && row.isCollapsed))
  const [isCollapsing, setIsCollapsing] = React.useState(false)
  const [isExpanding, setIsExpanding] = React.useState(false)
  const prevCollapsedRef = React.useRef(row.isCollapsed)
  
  React.useEffect(() => {
    if (!isChild) return
    
    const wasCollapsed = prevCollapsedRef.current
    const isNowCollapsed = row.isCollapsed
    
    // Detect change
    if (wasCollapsed !== isNowCollapsed) {
      if (isNowCollapsed) {
        // Collapsing
        setIsCollapsing(true)
        setIsExpanding(false)
        const timer = setTimeout(() => {
          setShouldRender(false)
          setIsCollapsing(false)
        }, 300 + (childIndex * 30))
        prevCollapsedRef.current = isNowCollapsed
        return () => clearTimeout(timer)
      } else {
        // Expanding - mount first, then animate
        setShouldRender(true)
        setIsExpanding(true)
        
        // Small delay to ensure browser applies initial collapsed state before transitioning
        const timer = setTimeout(() => {
          setIsExpanding(false)
        }, 20)
        
        prevCollapsedRef.current = isNowCollapsed
        return () => clearTimeout(timer)
      }
    }
  }, [isChild, row.isCollapsed, childIndex])
  
  // Don't render after collapse animation
  if (isChild && !shouldRender) {
    return null
  }
  
  const transitionDelay = isChild ? `${childIndex * 30}ms` : '0ms'

  return (
    <div 
      className={`finance-row-wrapper ${isChild ? 'finance-row-child' : ''} ${isCollapsing ? 'collapsed' : 'expanded'}`}
      style={{ 
        display: 'contents'
      }}
    >
      <div 
        className={`finance-cell ${isChild ? 'finance-cell-child finance-cell-child-first' : ''} ${isCollapsing ? 'cell-collapsing' : isExpanding ? 'cell-expanding' : ''} ${ctxCatHighlight === row.id ? 'ctx-active' : ''}`}
        style={{ transitionDelay }}
      >
        <div className="cell-name flex items-center gap-2">
          {hasChildren ? (
            <button
              className="shrink-0 border border-gray-300 bg-white w-6 h-6 flex items-center justify-center transition-all duration-200"
              style={{ borderRadius: '8px' }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleCollapse(row.id)
              }}
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              <ChevronRight 
                className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${
                  collapsed ? 'rotate-0' : 'rotate-90'
                }`} 
              />
            </button>
          ) : (
            <div className="w-6 shrink-0 flex items-center justify-center">
              {isChild && (
                <CornerDownRight className="w-3 h-3 text-gray-400" />
              )}
            </div>
          )}
          <span className={`flex-1 truncate ${row.parent_id ? '' : 'font-medium'}`}>{row.name}</span>
          <button
            className="icon-btn menu-btn"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              try {
                onNameContext(e, info)
              } catch (error) {
                console.error('Error opening category menu:', error)
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              try {
                onNameContext(e, info)
              } catch (error) {
                console.error('Error opening category menu:', error)
              }
            }}
            aria-label="Category actions"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {values.map((v, mi) => (
        <div
          key={mi}
          className={
            `finance-cell ${isChild ? 'finance-cell-child' : ''} ${isCollapsing ? 'cell-collapsing' : isExpanding ? 'cell-expanding' : ''} ` +
            (isCurrentYear && mi === currentMonth ? 'col-current ' : '') +
            (ctxCellHighlight && ctxCellHighlight.type === type && ctxCellHighlight.catId === row.id && ctxCellHighlight.month === mi ? 'ctx-active' : '')
          }
          style={{ transitionDelay }}
          onContextMenu={(e) => onCellContext(e, type, row.id, mi, v)}
        >
          <button 
            className={`cell-btn ${!v || v === 0 ? 'cell-btn-empty' : ''} ${hasChildren ? 'cell-btn-parent' : ''}`}
            onClick={() => !hasChildren && onCellEdit(type, row.id, mi)}
            onContextMenu={(e) => !hasChildren && onCellContext(e, type, row.id, mi, v)}
            disabled={hasChildren}
          >
            {fmt(v)}
          </button>
        </div>
      ))}
    </div>
  )
}
