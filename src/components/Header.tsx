import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

function clearFinanceCache(){
  try{
    const keys = Object.keys(localStorage)
    for(const k of keys){ if(k.startsWith ? k.startsWith("finance:") : k.indexOf("finance:")===0) localStorage.removeItem(k) }
  }catch{}
}


const titles: Record<string, string> = {
  '/': 'Главная',
  '/finance': 'Финансы',
  '/tasks': 'Задачи',
  '/goals': 'Цели',
  '/notes': 'Заметки',
}

export default function Header(){
  const location = useLocation()
  const [email, setEmail] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setEmail(sess?.user?.email ?? null)
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  const title = titles[location.pathname] ?? 'Раздел'

  async function signOut(){
    await supabase.auth.signOut()
    clearFinanceCache()
window.location.href = '/login'
  }

  return (
    <div className="hidden lg:flex bg-white border-b border-gray-200 px-6 py-4 items-center justify-between">
      <div className="text-xl font-semibold text-gray-800">{title}</div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600">{email ?? '—'}</div>
        <Button variant="accent" size="sm" onClick={signOut}>Выйти</Button>
      </div>
    </div>
  )
}
