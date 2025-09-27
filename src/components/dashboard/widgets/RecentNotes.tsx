import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { DASHBOARD } from '@/config/dashboard.config';
import { getUserId } from '@/lib/auth';
type Note = { id: string; title: string | null; updatedAt: string };
export default function RecentNotes() {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">Последние заметки</h2>
      <div className="text-sm text-neutral-500">Минимальная версия для отладки</div>
    </div>
  );
}
