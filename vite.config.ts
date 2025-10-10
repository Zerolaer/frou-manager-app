import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env': JSON.stringify(process.env)
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            if (id.includes('date-fns')) {
              return 'vendor-date'
            }
            // Other node_modules
            return 'vendor-other'
          }
          
          // Feature-based chunks
          if (id.includes('/pages/')) {
            const page = id.split('/pages/')[1].split('.')[0]
            return `page-${page.toLowerCase()}`
          }
          if (id.includes('/components/finance/')) {
            return 'feature-finance'
          }
          if (id.includes('/components/tasks/')) {
            return 'feature-tasks'
          }
          if (id.includes('/components/notes/')) {
            return 'feature-notes'
          }
          if (id.includes('/components/dashboard/')) {
            return 'feature-dashboard'
          }
        },
        // Use content hash for better caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1000,
    // Enable source maps for better debugging in production
    sourcemap: false,
    // Optimize CSS
    cssMinify: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js', 'lucide-react', 'date-fns'],
    force: false
  },
  server: {
    fs: {
      strict: false
    },
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  }
})
