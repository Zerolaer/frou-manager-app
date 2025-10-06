// Environment variables configuration
export const env = {
  NODE_ENV: import.meta.env.MODE || 'development',
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
} as const

// Helper functions for environment checks
export const isDevelopment = () => env.DEV
export const isProduction = () => env.PROD
export const isNodeEnv = (env: string) => env === env.NODE_ENV
