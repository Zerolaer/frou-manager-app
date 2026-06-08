import { useCallback, useEffect, useRef, useState } from 'react'

const PULL_THRESHOLD = 64
const MAX_PULL = 88

type Options = {
  onRefresh: () => Promise<void>
  enabled?: boolean
  scrollSelector?: string
}

/**
 * Touch pull-to-refresh for mobile scroll containers (e.g. .mobile-shell-main).
 */
export function usePullToRefresh({
  onRefresh,
  enabled = true,
  scrollSelector = '.mobile-shell-main',
}: Options) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const pullRef = useRef(0)
  const pullingRef = useRef(false)
  const startYRef = useRef(0)
  const onRefreshRef = useRef(onRefresh)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  const resetPull = useCallback(() => {
    pullRef.current = 0
    setPullDistance(0)
    pullingRef.current = false
  }, [])

  useEffect(() => {
    if (!enabled) return

    const el = document.querySelector(scrollSelector) as HTMLElement | null
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing || el.scrollTop > 2) return
      startYRef.current = e.touches[0].clientY
      pullingRef.current = true
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current || refreshing) return
      const dy = e.touches[0].clientY - startYRef.current
      if (dy > 0 && el.scrollTop <= 0) {
        const distance = Math.min(dy * 0.45, MAX_PULL)
        pullRef.current = distance
        setPullDistance(distance)
        if (distance > 8) e.preventDefault()
      } else if (dy <= 0) {
        resetPull()
      }
    }

    const onTouchEnd = async () => {
      if (!pullingRef.current) return
      const shouldRefresh = pullRef.current >= PULL_THRESHOLD
      pullingRef.current = false

      if (shouldRefresh && !refreshing) {
        setRefreshing(true)
        resetPull()
        try {
          await onRefreshRef.current()
        } finally {
          setRefreshing(false)
        }
      } else {
        resetPull()
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [enabled, refreshing, resetPull, scrollSelector])

  return { pullDistance, refreshing }
}
