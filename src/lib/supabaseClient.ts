import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
// Vite automatically loads .env file variables prefixed with VITE_
// TEMPORARY FIX: Hardcode values if env vars not loaded (for local dev)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://anugfsevzdpsehfzflji.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFudWdmc2V2emRwc2VoZnpmbGppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTM4NDEsImV4cCI6MjA3MTM2OTg0MX0.1-UpIU59Xp8T93Gcp5TpIOXJVSm2ANdTvEm69uD1ciw';

// Debug: Log ALL env vars in dev mode to see what's available
if (import.meta.env.DEV) {
  console.log('🔍 Environment check:', {
    VITE_SUPABASE_URL: supabaseUrl ? '✅ Loaded' : '❌ Missing',
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? '✅ Loaded' : '❌ Missing',
    url: supabaseUrl || 'undefined',
    keyLength: supabaseAnonKey?.length || 0,
    allEnvKeys: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'))
  });
  
  // If variables are missing, show helpful message
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ TROUBLESHOOTING:');
    console.warn('1. Check that .env file exists in project root (not in src/)');
    console.warn('2. Restart dev server after creating/editing .env file');
    console.warn('3. Variables must start with VITE_ prefix');
    console.warn('4. No spaces around = sign in .env file');
  }
}

// Create a mock client if env vars are missing (for development)
let supabase: ReturnType<typeof createClient>;

// Always use the values (they have fallbacks now)
supabase = createClient(supabaseUrl, supabaseAnonKey);
if (import.meta.env.DEV) {
  console.log('✅ Supabase client initialized with:', supabaseUrl);
}

export { supabase };
