/**
 * Shared dynamic import loaders for route-level code splitting.
 * Must match lazy() paths in main.tsx so prefetch warms the same chunks.
 */
export const routeImports = {
  login: () => import('@/pages/Login'),
  signup: () => import('@/pages/Signup'),
  forgotPassword: () => import('@/pages/ForgotPassword'),
  resetPassword: () => import('@/pages/ResetPassword'),
  home: () => import('@/pages/Home'),
  finance: () => import('@/pages/Finance'),
  tasks: () => import('@/pages/Tasks'),
  notes: () => import('@/pages/Notes'),
  canvas: () => import('@/pages/Canvas'),
  habits: () => import('@/pages/Habits'),
  settings: () => import('@/pages/Settings'),
  storybook: () => import('@/pages/Storybook'),
} as const

export type RoutePrefetchKey = keyof typeof routeImports

const inflight = new Map<RoutePrefetchKey, Promise<unknown>>()

/** Warm a route chunk (no-op if already loading or loaded). */
export function prefetchRoute(key: RoutePrefetchKey): void {
  if (inflight.has(key)) return
  inflight.set(key, routeImports[key]().catch(() => inflight.delete(key)))
}

const pathToKey: Record<string, RoutePrefetchKey> = {
  '/': 'home',
  '/finance': 'finance',
  '/tasks': 'tasks',
  '/notes': 'notes',
  '/canvas': 'canvas',
  '/habits': 'habits',
  '/settings': 'settings',
  '/storybook': 'storybook',
}

export function prefetchRoutePath(pathname: string): void {
  const base = pathname.startsWith('/canvas') ? '/canvas' : pathname
  const key = pathToKey[base]
  if (key) prefetchRoute(key)
}

/** After shell is ready — prefetch routes users open most often. */
export function prefetchCommonRoutes(options?: { mobile?: boolean }): void {
  const keys: RoutePrefetchKey[] = options?.mobile
    ? ['tasks', 'finance']
    : ['tasks', 'finance', 'notes', 'canvas']

  const run = () => keys.forEach((k) => prefetchRoute(k))

  if (typeof window === 'undefined') return

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 2500 })
  } else {
    setTimeout(run, 400)
  }
}

/** Warm likely next routes while auth session is still resolving. */
export function prefetchDuringAuthBootstrap(mobile?: boolean): void {
  prefetchRoute('home')
  if (mobile) {
    prefetchRoute('tasks')
    prefetchRoute('finance')
  }
}
