import { PageSkeleton } from '@/components/ui/Skeleton'

/** In-shell fallback while a lazy route chunk loads — header/nav stay visible. */
export default function PageRouteFallback() {
  return (
    <div
      className="flex-1 min-h-0 overflow-hidden"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading page"
    >
      <PageSkeleton />
    </div>
  )
}
