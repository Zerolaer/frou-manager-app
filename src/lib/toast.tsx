import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type Toast = { id: string, title?: string, message: string, duration?: number }
type Ctx = {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  remove: (id: string) => void
}
const ToastCtx = createContext<Ctx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }){
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    const toast: Toast = { id, duration: 3000, ...t }
    setToasts(prev => [...prev, toast])
    if (toast.duration){
      setTimeout(() => remove(id), toast.duration)
    }
  }, [remove])

  const value = useMemo(() => ({ toasts, push, remove }), [toasts, push, remove])

  return <ToastCtx.Provider value={value}>{children}</ToastCtx.Provider>
}

export function useToast(){
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
