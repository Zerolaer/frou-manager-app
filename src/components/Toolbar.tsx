import { useLocation } from 'react-router-dom'

export default function Toolbar(){
  const { pathname } = useLocation()
  if (pathname === '/') return (
    <div className="toolbar mt-4 flex items-center gap-2">
      <span className="opacity-70 text-sm">Быстрые действия:</span>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Добавить виджет</button>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Обновить</button>
    </div>
  )
  if (pathname.startsWith('/finance')) return (
    <div className="toolbar mt-4 flex items-center gap-2">
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Новая операция</button>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Импорт</button>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Фильтры</button>
    </div>
  )
  if (pathname.startsWith('/tasks')) return (
    <div className="toolbar mt-4 flex items-center gap-2">
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Новая задача</button>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Сегодня</button>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Фильтр</button>
    </div>
  )
  if (pathname.startsWith('/goals')) return (
    <div className="toolbar mt-4 flex items-center gap-2">
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Новая цель</button>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Период</button>
    </div>
  )
  if (pathname.startsWith('/notes')) return (
    <div className="toolbar mt-4 flex items-center gap-2">
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Новая заметка</button>
      <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Поиск</button>
    </div>
  )
  return null
}
