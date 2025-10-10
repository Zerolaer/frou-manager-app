import React, { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react'

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string | number
  overscan?: number
  className?: string
}

export const VirtualizedList = memo(<T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  overscan = 5,
  className = ''
}: VirtualizedListProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index
    }))
  }, [items, visibleRange])

  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.startIndex * itemHeight

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div
              key={keyExtractor(item, index)}
              style={{ height: itemHeight }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

VirtualizedList.displayName = 'VirtualizedList'

// Hook for virtualized list calculations
export function useVirtualization(
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan])

  const totalHeight = itemCount * itemHeight
  const offsetY = visibleRange.startIndex * itemHeight

  return {
    visibleRange,
    totalHeight,
    offsetY,
    setScrollTop
  }
}

// Optimized infinite scroll list
interface InfiniteScrollListProps<T> {
  items: T[]
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string | number
  itemHeight?: number
  className?: string
}

export const InfiniteScrollList = memo(<T,>({
  items,
  hasMore,
  isLoading,
  onLoadMore,
  renderItem,
  keyExtractor,
  itemHeight,
  className = ''
}: InfiniteScrollListProps<T>) => {
  const observerRef = useRef<IntersectionObserver>()
  const lastItemRef = useCallback((node: HTMLDivElement) => {
    if (isLoading) return
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        onLoadMore()
      }
    })
    
    if (node) observerRef.current.observe(node)
  }, [isLoading, hasMore, onLoadMore])

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return (
    <div className={className}>
      {items.map((item, index) => {
        const isLastItem = index === items.length - 1
        return (
          <div
            key={keyExtractor(item, index)}
            ref={isLastItem ? lastItemRef : null}
            style={itemHeight ? { height: itemHeight } : undefined}
          >
            {renderItem(item, index)}
          </div>
        )
      })}
      {isLoading && (
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
        </div>
      )}
    </div>
  )
})

InfiniteScrollList.displayName = 'InfiniteScrollList'

// Optimized grid with virtualization
interface VirtualizedGridProps<T> {
  items: T[]
  columns: number
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string | number
  gap?: number
  className?: string
}

export const VirtualizedGrid = memo(<T,>({
  items,
  columns,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  gap = 16,
  className = ''
}: VirtualizedGridProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const rows = Math.ceil(items.length / columns)
  const rowHeight = itemHeight + gap

  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 2)
    const endRow = Math.min(rows - 1, Math.ceil((scrollTop + containerHeight) / rowHeight) + 2)
    return { startRow, endRow }
  }, [scrollTop, rowHeight, containerHeight, rows])

  const visibleItems = useMemo(() => {
    const { startRow, endRow } = visibleRange
    const result: Array<{ item: T; index: number; row: number; col: number }> = []
    
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col
        if (index < items.length) {
          result.push({
            item: items[index],
            index,
            row,
            col
          })
        }
      }
    }
    
    return result
  }, [items, visibleRange, columns])

  const totalHeight = rows * rowHeight
  const offsetY = visibleRange.startRow * rowHeight

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: `${gap}px`
          }}
        >
          {visibleItems.map(({ item, index, row, col }) => (
            <div
              key={keyExtractor(item, index)}
              style={{ height: itemHeight }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

VirtualizedGrid.displayName = 'VirtualizedGrid'
