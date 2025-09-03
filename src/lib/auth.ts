import { supabase } from './supabaseClient';
let cachedUserId: string | null = null;
export async function getUserId(): Promise<string | null> {
  if (cachedUserId) return cachedUserId;
  const { data, error } = await supabase.auth.getUser();
  if (error) { console.error("[auth] getUser error:", error.message); return null; }
  cachedUserId = data.user?.id ?? null;
  return cachedUserId;
}
