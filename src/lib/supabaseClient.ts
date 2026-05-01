import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase URL/anon key читаются из Vite-переменных среды (`VITE_SUPABASE_URL`,
 * `VITE_SUPABASE_ANON_KEY`). В dev-режиме допускается hardcoded fallback,
 * чтобы не ломать локальную разработку без `.env`. В production обязательны env —
 * иначе билд падает явной ошибкой и не уезжает на пользователей с пустым клиентом.
 *
 * NB: anon key — публичный ключ (RLS защищает данные), но коммитить его всё
 * равно не стоит. Для каждого окружения — свои env.
 */

const DEV_FALLBACK_URL = 'https://anugfsevzdpsehfzflji.supabase.co'
const DEV_FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFudWdmc2V2emRwc2VoZnpmbGppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTM4NDEsImV4cCI6MjA3MTM2OTg0MX0.1-UpIU59Xp8T93Gcp5TpIOXJVSm2ANdTvEm69uD1ciw'

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let supabaseUrl = envUrl ?? ''
let supabaseAnonKey = envKey ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    supabaseUrl = supabaseUrl || DEV_FALLBACK_URL
    supabaseAnonKey = supabaseAnonKey || DEV_FALLBACK_ANON_KEY
    // eslint-disable-next-line no-console
    console.warn(
      '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY не заданы — используется dev-fallback. ' +
        'Создайте .env по шаблону .env.example.'
    )
  } else {
    throw new Error(
      'Missing Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
        'Set them at build time (CI / hosting environment).'
    )
  }
}

/**
 * Используем `SupabaseClient<any, 'public', any>`, чтобы `.from('table')` принимал
 * любые таблицы и возвращал loose-типы. Полную типизацию через сгенерированный
 * `Database` тип можно добавить позже без миграции вызовов.
 */
const supabase: SupabaseClient<any, 'public', any> = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

export { supabase }
