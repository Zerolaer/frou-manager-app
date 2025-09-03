export function QuickLinks() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold tracking-[-0.01em] mb-4">Быстрые действия</h2>
      <div className="grid grid-cols-1 gap-2">
        <a href="/tasks/new" className="btn">+ Новая задача</a>
        <a href="/notes/new" className="btn">+ Новая заметка</a>
        <a href="/finance?add=income" className="btn">+ Доход</a>
        <a href="/finance?add=expense" className="btn">+ Расход</a>
      </div>
    </div>
  );
}
