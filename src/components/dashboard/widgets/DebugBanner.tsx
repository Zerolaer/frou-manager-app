import { useEffect, useState } from 'react';
import { DASHBOARD } from '@/config/dashboard.config';
import { supabase } from '@/lib/supabaseClient';
import { getUserId } from '@/lib/auth';
type Check = { name: string; ok: boolean; msg?: string };
export default function DebugBanner() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  useEffect(() => {
    if (!DASHBOARD.debug) return;
    let cancelled = false;
    (async () => {
      const out: Check[] = [];
      const uid = await getUserId();
      out.push({ name: 'Auth', ok: !!uid, msg: uid ? 'OK' : 'Нет пользователя' });
      try {
        const { error } = await supabase.from(DASHBOARD.notes.table).select(DASHBOARD.notes.id).limit(1);
        out.push({ name: 'Notes', ok: !error, msg: error?.message });
      } catch (e: any) { out.push({ name: 'Notes', ok: false, msg: e?.message }); }
      try {
        const { error } = await supabase.from(DASHBOARD.tasks.table).select(DASHBOARD.tasks.id).limit(1);
        out.push({ name: 'Tasks', ok: !error, msg: error?.message });
      } catch (e: any) { out.push({ name: 'Tasks', ok: false, msg: e?.message }); }
      try {
        const { error } = await supabase.from(DASHBOARD.finance.table).select(DASHBOARD.finance.id).limit(1);
        out.push({ name: 'Finance', ok: !error, msg: error?.message });
      } catch (e: any) { out.push({ name: 'Finance', ok: false, msg: e?.message }); }
      if (!cancelled) setChecks(out);
    })();
    return () => { cancelled = true; };
  }, []);
  if (!DASHBOARD.debug || !checks) return null;
  const hasErr = checks.some(c => !c.ok);
  if (!hasErr) return null;
  return (
    <div className="mb-4 card border-warning bg-warning-light">
      <div className="font-semibold mb-2 text-warning">Диагностика</div>
      <ul className="list-disc pl-5 space-y-1 text-sm">
        {checks.map((c, i) => (
          <li key={i}>
            <span className={c.ok ? 'text-success' : 'text-danger'}>
              {c.name}: {c.ok ? 'OK' : 'Ошибка'}
            </span>
            {c.msg && <span className="ml-2 opacity-80">{c.msg}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
