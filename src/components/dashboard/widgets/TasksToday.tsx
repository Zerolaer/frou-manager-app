import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { startOfTodayTZ, endOfTodayTZ } from '@/lib/dateUtils';
import { DASHBOARD } from '@/config/dashboard.config';
import { getUserId } from '@/lib/auth';
type Task = { id: string; title: string | null; due: string | null; status?: string | null; priority?: string | null; };
export function TasksToday() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const start = useMemo(() => startOfTodayTZ(DASHBOARD.TZ).toISOString(), []);
  const end = useMemo(() => endOfTodayTZ(DASHBOARD.TZ).toISOString(), []);
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const t = DASHBOARD.tasks;
        const fields = [t.id, t.title, t.due, t.status, t.priority].filter(Boolean).join(',');
        let q = supabase.from(t.table).select(fields);
        const uidCol = t.userId; const uid = await getUserId();
        if (uidCol && uid) q = q.eq(uidCol, uid);
        q = q.gte(t.due, start).lte(t.due, end);
        if (t.status) q = q.neq(t.status, t.statusDoneValue);
        const { data, error } = await q.order(t.priority || t.due, { ascending: true }).limit(50);
        if (error) throw error;
        const mapped: Task[] = (data as any[]).map(r => ({
          id: r[t.id], title: r[t.title], due: r[t.due],
          status: t.status ? r[t.status] : null, priority: t.priority ? r[t.priority] : null,
        }));
        if (!ignore) setTasks(mapped);
      } catch (e: any) { if (!ignore) setErr(e?.message || 'Ошибка загрузки задач'); }
      finally { if (!ignore) setLoading(false); }
    })();
    return () => { ignore = true; };
  }, [start, end]);
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold">Задачи на сегодня</h2>
          <span className="text-xs text-neutral-500">{new Date().toLocaleDateString('ru-RU')}</span>
        </div>
        <a href="/tasks" className="text-sm text-primary hover:underline">Открыть все</a>
      </div>
      {loading ? (
        <div className="text-sm text-neutral-500">Загрузка…</div>
      ) : err ? (
        <div className="text-sm text-danger">Ошибка: {err}</div>
      ) : tasks.length === 0 ? (
        <div className="text-sm text-neutral-500">На сегодня нет задач.</div>
      ) : (
        <ul className="space-y-2">
          {tasks.map(t => (
            <li key={t.id} className="flex items-center gap-3 card-compact hover:bg-neutral-50">
              <div className="w-5 h-5 shrink-0 rounded border border-neutral-300 bg-white" />
              <div className="flex-1">
                <div className="text-sm">{t.title || 'Без названия'}</div>
                <div className="text-xs text-neutral-500">
                  {t.due ? `Срок: ${new Date(t.due).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}` : ''}
                </div>
              </div>
              <a className="btn btn-sm" href={`/tasks`}>Открыть</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
