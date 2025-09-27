import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { startOfTodayTZ, endOfTodayTZ } from '@/lib/dateUtils';
import { DASHBOARD } from '@/config/dashboard.config';
import { getUserId } from '@/lib/auth';
type Task = { id: string; title: string | null; due: string | null; status?: string | null; priority?: string | null; };
export default function TasksToday() {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">Задачи на сегодня</h2>
      <div className="text-sm text-neutral-500">Минимальная версия для отладки</div>
    </div>
  );
}
