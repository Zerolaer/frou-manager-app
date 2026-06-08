import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import PageSubHeader, { type PageSubHeaderProps } from './PageSubHeader'

const SUBHEADER_ROUTES = new Set(['/', '/finance', '/tasks', '/notes', '/habits'])

interface AppContentFrameProps extends PageSubHeaderProps {
  children: ReactNode
  isMobile: boolean
}

/** Desktop: white shell + inset gray rounded content well. Mobile: unchanged full-bleed main. */
export default function AppContentFrame({
  children,
  isMobile,
  ...subHeaderProps
}: AppContentFrameProps) {
  const { pathname } = useLocation()
  const hasSubheader = SUBHEADER_ROUTES.has(pathname)
  const isHomeRoute = pathname === '/'

  if (isMobile) {
    return (
      <main
        id="main-content"
        className="flex-1 overflow-x-hidden flex flex-col min-h-0 p-0 bg-background"
        role="main"
        aria-label="Основное содержимое"
      >
        {children}
      </main>
    )
  }

  return (
    <div className="app-content-frame">
      <main
        id="main-content"
        className={`app-content-well flex-1 flex flex-col min-h-0 ${
          hasSubheader
            ? `app-content-well--with-subheader p-4 pt-0 gap-4 ${
                isHomeRoute ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'
              }`
            : 'p-4 overflow-hidden gap-4'
        }`}
        role="main"
        aria-label="Основное содержимое"
      >
        {hasSubheader && <PageSubHeader {...subHeaderProps} />}
        <div id="app-content-body" className="app-content-body flex-1 min-h-0 flex flex-col overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
