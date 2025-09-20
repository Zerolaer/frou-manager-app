import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AccessibleButton } from './AccessibleComponents'
import { ARIA_LABELS } from '@/lib/accessibility'

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
    <header 
      className="hidden lg:flex bg-white border-b border-gray-200 px-6 py-4 items-center justify-between"
      role="banner"
      aria-label="Заголовок страницы"
    >
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600" aria-label={`Пользователь: ${email ?? 'неизвестно'}`}>
          {email ?? '—'}
        </div>
        <AccessibleButton
          variant="secondary"
          size="sm"
          onClick={signOut}
          ariaLabel="Выйти из системы"
          announceOnClick="Выход из системы"
        >
          Выйти
        </AccessibleButton>
      </div>
    </header>
  )
}
