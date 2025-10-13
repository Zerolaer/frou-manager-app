import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { logger } from '@/lib/monitoring'

interface VirtualizedGridProps<T> {
  items: T[]
  itemHeight: number
  itemWidth: number
  containerHeight: number
  containerWidth: number
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  overscan?: number
  className?: string
  onScroll?: (scrollTop: number, scrollLeft: number) => void
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void
}

interface GridDimensions {
  rows: number
  cols: number
  totalItems: number
  containerWidth: number
  containerHeight: number
  itemWidth: number
  itemHeight: number
}

export function VirtualizedGrid<T>({
  items,
  itemHeight,
  itemWidth,
  containerHeight,
  containerWidth,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  onVisibleRangeChange
}: VirtualizedGridProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()

  // Calculate grid dimensions
  const dimensions = useMemo((): GridDimensions => {
    const cols = Math.floor(containerWidth / itemWidth)
    const rows = Math.ceil(items.length / cols)
    
    return {
      rows,
      cols,
      totalItems: items.length,
      containerWidth,
      containerHeight,
      itemWidth,
      itemHeight
    }
  }, [items.length, containerWidth, containerHeight, itemWidth, itemHeight])

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startRow = Math.floor(scrollTop / itemHeight)
    const endRow = Math.min(
      Math.ceil((scrollTop + containerHeight) / itemHeight),
      dimensions.rows - 1
    )

    const startCol = Math.floor(scrollLeft / itemWidth)
    const endCol = Math.min(
      Math.ceil((scrollLeft + containerWidth) / itemWidth),
      dimensions.cols - 1
    )

    // Apply overscan
    const overscanStartRow = Math.max(0, startRow - overscan)
    const overscanEndRow = Math.min(dimensions.rows - 1, endRow + overscan)
    const overscanStartCol = Math.max(0, startCol - overscan)
    const overscanEndCol = Math.min(dimensions.cols - 1, endCol + overscan)

    return {
      startRow: overscanStartRow,
      endRow: overscanEndRow,
      startCol: overscanStartCol,
      endCol: overscanEndCol
    }
  }, [scrollTop, scrollLeft, itemHeight, itemWidth, containerHeight, containerWidth, dimensions, overscan])

  // Generate visible items
  const visibleItems = useMemo(() => {
    const items: Array<{
      item: T
      index: number
      row: number
      col: number
      style: React.CSSProperties
    }> = []

    for (let row = visibleRange.startRow; row <= visibleRange.endRow; row++) {
      for (let col = visibleRange.startCol; col <= visibleRange.endCol; col++) {
        const index = row * dimensions.cols + col
        
        if (index < items.length) {
          visibleItems.push({
            item: items[index],
            index,
            row,
            col,
            style: {
              position: 'absolute',
              top: row * itemHeight,
              left: col * itemWidth,
              width: itemWidth,
              height: itemHeight,
              transform: `translate3d(0, 0, 0)` // Hardware acceleration
            }
          })
        }
      }
    }

    return items
  }, [visibleRange, dimensions.cols, itemHeight, itemWidth, items])

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const newScrollTop = target.scrollTop
    const newScrollLeft = target.scrollLeft

    setScrollTop(newScrollTop)
    setScrollLeft(newScrollLeft)

    if (onScroll) {
      onScroll(newScrollTop, newScrollLeft)
    }

    // Debounce scrolling state
    setIsScrolling(true)
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 150)
  }, [onScroll])

  // Notify visible range changes
  useEffect(() => {
    if (onVisibleRangeChange && visibleItems.length > 0) {
      const startIndex = Math.min(...visibleItems.map(item => item.index))
      const endIndex = Math.max(...visibleItems.map(item => item.index))
      onVisibleRangeChange(startIndex, endIndex)
    }
  }, [visibleItems, onVisibleRangeChange])

  // Calculate total content size
  const contentHeight = dimensions.rows * itemHeight
  const contentWidth = dimensions.cols * itemWidth

  return (
    <div
      ref={scrollRef}
      className={`virtualized-grid ${className}`}
      style={{
        width: containerWidth,
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      {/* Virtual content container */}
      <div
        style={{
          width: contentWidth,
          height: contentHeight,
          position: 'relative'
        }}
      >
        {/* Visible items */}
        {visibleItems.map(({ item, index, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index, style)}
          </div>
        ))}
      </div>

      {/* Scroll indicators */}
      {isScrolling && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          {visibleItems.length} / {items.length} items
        </div>
      )}
    </div>
  )
}

// Hook for virtualized grid performance monitoring
export function useVirtualizedGridPerformance() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    visibleItems: 0,
    totalItems: 0,
    scrollPosition: { top: 0, left: 0 }
  })

  const measureRender = useCallback((startTime: number, visibleItems: number, totalItems: number) => {
    const renderTime = performance.now() - startTime
    setMetrics(prev => ({
      ...prev,
      renderTime,
      visibleItems,
      totalItems
    }))
  }, [])

  const updateScrollPosition = useCallback((top: number, left: number) => {
    setMetrics(prev => ({
      ...prev,
      scrollPosition: { top, left }
    }))
  }, [])

  return { metrics, measureRender, updateScrollPosition }
}

// Optimized virtualized list for one-dimensional data
interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  height: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 10,
  className = ''
}: VirtualizedListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      Math.ceil((scrollTop + height) / itemHeight),
      items.length - 1
    )

    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan)
    }
  }, [scrollTop, itemHeight, height, items.length, overscan])

  const visibleItems = useMemo(() => {
    const visibleItems: Array<{
      item: T
      index: number
      style: React.CSSProperties
    }> = []

    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      visibleItems.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute',
          top: i * itemHeight,
          width: '100%',
          height: itemHeight,
          transform: 'translate3d(0, 0, 0)'
        }
      })
    }

    return visibleItems
  }, [visibleRange, items, itemHeight])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const contentHeight = items.length * itemHeight

  return (
    <div
      ref={scrollRef}
      className={`virtualized-list ${className}`}
      style={{
        height,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: contentHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}

// Performance monitoring component
export function VirtualizationMonitor({ metrics }: { metrics: any }) {
  return (
    <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-sm font-mono">
      <div>Render: {metrics.renderTime.toFixed(2)}ms</div>
      <div>Visible: {metrics.visibleItems} / {metrics.totalItems}</div>
      <div>Scroll: {metrics.scrollPosition.top.toFixed(0)}, {metrics.scrollPosition.left.toFixed(0)}</div>
    </div>
  )
}
