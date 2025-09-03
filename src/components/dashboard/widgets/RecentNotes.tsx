import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { DASHBOARD } from '@/config/dashboard.config';
import { getUserId } from '@/lib/auth';
type Note = { id: string; title: string | null; updatedAt: string };
export function RecentNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const n = DASHBOARD.notes;
        let q = supabase.from(n.table).select(`${n.id},${n.title},${n.updatedAt}`);
        const uidCol = n.userId; const uid = await getUserId();
        if (uidCol && uid) q = q.eq(uidCol, uid);
        const { data, error } = await q.order(n.updatedAt, { ascending: false }).limit(6);
        if (error) throw error;
        const mapped: Note[] = (data as any[]).map(r => ({ id: r[n.id], title: r[n.title], updatedAt: r[n.updatedAt] }));
        if (!ignore) setNotes(mapped);
      } catch (e: any) { if (!ignore) setErr(e?.message || 'Ошибка загрузки заметок'); }
      finally { if (!ignore) setLoading(false); }
    })();
    return () => { ignore = true; };
  }, []);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-[-0.01em]">Последние заметки</h2>
        <a href="/notes" className="text-sm text-blue-600 hover:underline">Все заметки</a>
      </div>
      {loading ? <div className="text-sm text-gray-500">Загрузка…</div> :
       err ? <div className="text-sm text-red-600">Ошибка: {err}</div> :
       notes.length === 0 ? <div className="text-sm text-gray-500">Заметок нет.</div> :
       <ul className="space-y-2">
         {notes.slice(0,3).map(n => (
           <li key={n.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
             <div className="min-w-0">
               <div className="truncate text-sm">{n.title || 'Без названия'}</div>
               <div className="text-xs text-gray-500">Обновлено {new Date(n.updatedAt).toLocaleString('ru-RU')}</div>
             </div>
             <a className="btn" href={`/notes?id=${n.id}`}>Открыть</a>
           </li>
         ))}
       </ul>}
    </div>
  );
}
