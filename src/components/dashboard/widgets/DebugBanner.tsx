import { useEffect, useState } from 'react';
import { DASHBOARD } from '@/config/dashboard.config';
import { supabase } from '@/lib/supabaseClient';
import { getUserId } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

type Check = { name: string; ok: boolean; msg?: string };
export function DebugBanner() {
  const { t } = useTranslation()
  const [checks, setChecks] = useState<Check[] | null>(null);
  useEffect(() => {
    if (!DASHBOARD.debug) return;
    let cancelled = false;
    (async () => {
      const out: Check[] = [];
      const uid = await getUserId();
      out.push({ name: 'Auth', ok: !!uid, msg: uid ? 'OK' : t('dashboard.noUser') });
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
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="font-semibold mb-2">{t('dashboard.diagnostics')}</div>
      <ul className="list-disc pl-5 space-y-1">
        {checks.map((c, i) => (
          <li key={i}><span className={c.ok ? 'text-emerald-700' : 'text-red-700'}>{c.name}: {c.ok ? 'OK' : t('dashboard.error')}</span>{c.msg ? <span className="ml-2 opacity-80">{c.msg}</span> : null}</li>
        ))}
      </ul>
    </div>
  );
}
