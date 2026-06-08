import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { DollarSign, CheckSquare } from 'lucide-react'
import { useSafeTranslation } from '@/utils/safeTranslation'
import { prefetchRoutePath } from '@/lib/routePrefetch'
import { cn } from '@/lib/utils'
import '@/mobile-shell.css'

type NavItem = {
  path: string
  icon: typeof CheckSquare
  label: string
  match: (pathname: string) => boolean
}

type SliderMetrics = {
  x: number
  y: number
  width: number
  height: number
}

export default function BottomNav() {
  const location = useLocation()
  const { t } = useSafeTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [sliderReady, setSliderReady] = useState(false)
  const [slider, setSlider] = useState<SliderMetrics>({ x: 0, y: 0, width: 0, height: 0 })

  const navItems: NavItem[] = [
    {
      path: '/finance',
      icon: DollarSign,
      label: t('nav.finance'),
      match: (p) => p === '/finance',
    },
    {
      path: '/tasks',
      icon: CheckSquare,
      label: t('nav.tasks'),
      match: (p) => p === '/tasks' || p === '/',
    },
  ]

  const activeKey =
    navItems.find((item) => item.match(location.pathname))?.path ?? navItems[0].path

  const measureSlider = useCallback(() => {
    const el = itemRefs.current[activeKey]
    const container = containerRef.current
    if (!el || !container) return

    const containerRect = container.getBoundingClientRect()
    const itemRect = el.getBoundingClientRect()
    if (itemRect.width === 0) return

    setSlider({
      x: itemRect.left - containerRect.left,
      y: itemRect.top - containerRect.top,
      width: itemRect.width,
      height: itemRect.height,
    })
    setSliderReady(true)
  }, [activeKey])

  useLayoutEffect(() => {
    measureSlider()
  }, [activeKey, measureSlider])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const ro = new ResizeObserver(() => measureSlider())
    ro.observe(container)
    window.addEventListener('resize', measureSlider)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measureSlider)
    }
  }, [measureSlider])

  return (
    <nav className="mobile-bottom-nav" aria-label={t('aria.mainNavigation')}>
      <div className="mobile-bottom-nav__dock">
        <div ref={containerRef} className="mobile-bottom-nav__track">
          <div
            className={cn('mobile-bottom-nav__slider', sliderReady && 'is-ready')}
            style={{
              width: slider.width,
              height: slider.height,
              transform: `translate(${slider.x}px, ${slider.y}px)`,
            }}
            aria-hidden
          />
          {navItems.map((item) => {
            const isActive = item.path === activeKey
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                ref={(el) => {
                  itemRefs.current[item.path] = el
                  if (el && item.path === activeKey) {
                    requestAnimationFrame(measureSlider)
                  }
                }}
                to={item.path}
                onMouseEnter={() => prefetchRoutePath(item.path)}
                onFocus={() => prefetchRoutePath(item.path)}
                onTouchStart={() => prefetchRoutePath(item.path)}
                className={cn(
                  'mobile-bottom-nav__bubble',
                  isActive && 'is-active'
                )}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="mobile-bottom-nav__icon" strokeWidth={isActive ? 2.5 : 2} />
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
