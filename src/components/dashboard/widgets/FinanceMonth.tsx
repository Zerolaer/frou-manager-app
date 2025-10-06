import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { monthRangeTZ } from '@/lib/dateUtils';
import { formatCurrencyEUR } from '@/lib/format';
import { DASHBOARD } from '@/config/dashboard.config';
import { getUserId } from '@/lib/auth';
type Row = { amount: number; type?: string | null; flag?: boolean | null };
export function FinanceMonth() {
  const [{ start, end }] = useState(() => monthRangeTZ(DASHBOARD.TZ));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [modeUsed, setModeUsed] = useState<string>('');
  const monthLabel = useMemo(() => new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(start), [start]);
  
  // Получаем правильные год и месяц из start даты
  const currentYear = start.getFullYear();
  const currentMonth = start.getMonth() + 1; // getMonth() возвращает 0-11, нам нужно 1-12
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr(null);
      const f = DASHBOARD.finance;
      const uid = await getUserId();
      async function runTypeMode() {
        // Загружаем категории и записи отдельно, как в Finance.tsx
        let catsQuery = supabase.from('finance_categories').select('id,type');
        if (f.userId && uid) catsQuery = catsQuery.eq(f.userId, uid);
        
        let entriesQuery = supabase.from(f.table).select(`${f.amount},category_id`).eq('year', currentYear).eq('month', currentMonth).eq('included', true);
        if (f.userId && uid) entriesQuery = entriesQuery.eq(f.userId, uid);
        
        const [catsRes, entriesRes] = await Promise.all([
          catsQuery,
          entriesQuery
        ]);
        if (catsRes.error || entriesRes.error) throw catsRes.error || entriesRes.error;
        
        const cats = catsRes.data || [];
        const entries = entriesRes.data || [];
        const catTypes: Record<string, string> = {};
        cats.forEach(cat => catTypes[cat.id] = cat.type);
        
        return entries.map(r => ({ 
          amount: Number(r[f.amount] ?? 0), 
          type: catTypes[r.category_id] || 'unknown' 
        }));
      }
      async function runBoolMode() {
        const fields = [f.amount, f.boolField!].filter(Boolean).join(',');
        let q = supabase.from(f.table).select(fields);
        if (f.userId && uid) q = q.eq(f.userId, uid);
        q = q.eq('year', currentYear).eq('month', currentMonth).eq('included', true);
        const { data, error } = await q.limit(2000);
        if (error) throw error;
        return (data as any[]).map(r => ({ amount: Number(r[f.amount] ?? 0), flag: Boolean(r[f.boolField!]) }));
      }
      async function runSignMode() {
        let q = supabase.from(f.table).select(f.amount);
        if (f.userId && uid) q = q.eq(f.userId, uid);
        q = q.eq('year', currentYear).eq('month', currentMonth).eq('included', true);
        const { data, error } = await q.limit(2000);
        if (error) throw error;
        return (data as any[]).map(r => ({ amount: Number(r[f.amount] ?? 0) }));
      }
      try {
        let data: Row[] = [];
        if (f.mode === 'type') {
          data = await runTypeMode(); setModeUsed('type');
        } else if (f.mode === 'bool') {
          data = await runBoolMode(); setModeUsed('bool');
        } else if (f.mode === 'sign') {
          data = await runSignMode(); setModeUsed('sign');
        } else {
          // auto: сначала пробуем type, если ошибка — sign
          try { data = await runTypeMode(); setModeUsed('type'); }
          catch (e: any) { data = await runSignMode(); setModeUsed('sign'); }
        }
        if (!ignore) setRows(data);
      } catch (e: any) {
        if (!ignore) setErr(e?.message || 'Ошибка загрузки финансов');
      } finally { if (!ignore) setLoading(false); }
    })();
    return () => { ignore = true; };
  }, [start, end]);
  let income = 0, expense = 0;
  const f = DASHBOARD.finance;
  if (f.mode === 'type' || (f.mode === 'auto' && modeUsed === 'type')) {
    income = rows.filter(r => r.type === 'income').reduce((a, b) => a + (b.amount || 0), 0);
    expense = rows.filter(r => r.type === 'expense').reduce((a, b) => a + (b.amount || 0), 0);
  } else if (f.mode === 'bool') {
    income = rows.filter(r => !!r.flag).reduce((a, b) => a + (b.amount || 0), 0);
    expense = rows.filter(r => !r.flag).reduce((a, b) => a + (b.amount || 0), 0);
  } else {
    // sign
    income = rows.filter(r => (r.amount ?? 0) >= 0).reduce((a, b) => a + (b.amount || 0), 0);
    expense = rows.filter(r => (r.amount ?? 0) < 0).reduce((a, b) => a + Math.abs(b.amount || 0), 0);
  }
  const balance = income - expense;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-[-0.01em]">Финансы: {monthLabel}</h2>
        <a href="/finance" className="text-sm text-blue-600 hover:underline">Открыть финансы</a>
      </div>
      {loading ? <div className="text-sm text-gray-500">Загрузка…</div> :
       err ? <div className="text-sm text-red-600">Ошибка: {err}</div> :
       <div className="grid grid-cols-3 gap-3">
         <div className="rounded-xl border border-gray-100 p-4">
           <div className="text-xs text-gray-500 mb-1">Доходы</div>
           <div className="text-xl font-semibold">{formatCurrencyEUR(income)}</div>
         </div>
         <div className="rounded-xl border border-gray-100 p-4">
           <div className="text-xs text-gray-500 mb-1">Расходы</div>
           <div className="text-xl font-semibold">{formatCurrencyEUR(expense)}</div>
         </div>
         <div className="rounded-xl border border-gray-100 p-4">
           <div className="text-xs text-gray-500 mb-1">Баланс</div>
           <div className={"text-xl font-semibold " + (balance >= 0 ? "text-emerald-600" : "text-red-600")}>{formatCurrencyEUR(balance)}</div>
         </div>
       </div>}
    </div>
  );
}
