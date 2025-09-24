import { useLocation } from 'react-router-dom'
import { Plus, Filter, Search, Calendar, RefreshCw } from 'lucide-react'

export default function Toolbar(){
  const { pathname } = useLocation()
  if (pathname === '/') return (
    <div className="toolbar mt-4 flex items-center gap-2">
      <span className="opacity-70 text-sm">Быстрые действия:</span>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Добавить виджет
      </button>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm flex items-center gap-2">
        <RefreshCw className="w-4 h-4" />
        Обновить
      </button>
    </div>
  )
  if (pathname.startsWith('/finance')) return (
    <div className="toolbar mt-4 flex items-center gap-2">
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Новая операция
      </button>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm flex items-center gap-2">
        <RefreshCw className="w-4 h-4" />
        Импорт
      </button>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm flex items-center gap-2">
        <Filter className="w-4 h-4" />
        Фильтры
      </button>
    </div>
  )
  if (pathname.startsWith('/tasks')) return (
    <div className="toolbar mt-4 flex items-center gap-2">
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Новая задача
      </button>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Сегодня
      </button>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm flex items-center gap-2">
        <Filter className="w-4 h-4" />
        Фильтр
      </button>
    </div>
  )
  if (pathname.startsWith('/goals')) return (
    <div className="toolbar mt-4 flex items-center gap-2">
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Новая цель
      </button>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Период
      </button>
    </div>
  )
  if (pathname.startsWith('/notes')) return (
    <div className="toolbar mt-4 flex items-center gap-2">
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Новая заметка
      </button>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm flex items-center gap-2">
        <Search className="w-4 h-4" />
        Поиск
      </button>
    </div>
  )
  return null
}
