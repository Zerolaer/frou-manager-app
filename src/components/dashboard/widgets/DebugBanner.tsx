import { useEffect, useState } from 'react';
import { DASHBOARD } from '@/config/dashboard.config';
import { supabase } from '@/lib/supabaseClient';
import { getUserId } from '@/lib/auth';
type Check = { name: string; ok: boolean; msg?: string };
export default function DebugBanner() {
  return null; // Отключаем для отладки
}
