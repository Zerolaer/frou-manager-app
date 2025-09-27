import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { monthRangeTZ } from '@/lib/dateUtils';
import { formatCurrencyEUR } from '@/lib/format';
import { DASHBOARD } from '@/config/dashboard.config';
import { getUserId } from '@/lib/auth';
type Row = { amount: number; type?: string | null; flag?: boolean | null };
export default function FinanceMonth() {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">Финансы</h2>
      <div className="text-sm text-neutral-500">Минимальная версия для отладки</div>
    </div>
  );
}
