import React from 'react'
import { useToast } from '@/lib/toast'

export default function Toaster(){
  const { toasts, remove } = useToast()
  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2">
      {toasts.map(t => (
        <div key={t.id} className="rounded-xl bg-black text-white/90 px-4 py-3 shadow-lg min-w-[260px]">
          {t.title && <div className="text-sm font-semibold mb-0.5">{t.title}</div>}
          <div className="text-sm">{t.message}</div>
          <button
            className="absolute top-1 right-1 px-2 py-1 text-xs opacity-70 hover:opacity-100"
            onClick={() => remove(t.id)}
            aria-label="Close toast"
          >×</button>
        </div>
      ))}
    </div>
  )
}
