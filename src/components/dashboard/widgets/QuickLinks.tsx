import { Plus } from 'lucide-react'

export function QuickLinks() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold tracking-[-0.01em] mb-4">Быстрые действия</h2>
      <div className="grid grid-cols-1 gap-3">
        <a href="/tasks/new" className="btn flex items-center gap-2 justify-start">
          <Plus className="w-4 h-4" />
          Новая задача
        </a>
        <a href="/notes/new" className="btn flex items-center gap-2 justify-start">
          <Plus className="w-4 h-4" />
          Новая заметка
        </a>
        <a href="/finance?add=income" className="btn flex items-center gap-2 justify-start">
          <Plus className="w-4 h-4" />
          Доход
        </a>
        <a href="/finance?add=expense" className="btn flex items-center gap-2 justify-start">
          <Plus className="w-4 h-4" />
          Расход
        </a>
      </div>
    </div>
  );
}
