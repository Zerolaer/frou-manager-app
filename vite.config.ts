import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true,
      // Optimize React imports
      babel: {
        plugins: []
      }
    })
  ],
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
    // Enable tree shaking
    treeshake: true,
    // Optimize bundle size
    reportCompressedSize: true,
    // Enable rollup plugins for better optimization
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false
      },
      output: {
        manualChunks: (id) => {
          // Vendor chunks - optimized for caching
          if (id.includes('node_modules')) {
            // React ecosystem - rarely changes
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            // Supabase - stable API
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            // Icons - large but stable
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            // Date utilities - stable
            if (id.includes('date-fns')) {
              return 'vendor-date'
            }
            // i18n - stable
            if (id.includes('react-i18next') || id.includes('i18next')) {
              return 'vendor-i18n'
            }
            // Other node_modules
            return 'vendor-other'
          }
          
          // Core app chunks
          if (id.includes('/App.tsx') || id.includes('/main.tsx')) {
            return 'app-core'
          }
          
          // Page-based chunks - lazy loaded
          if (id.includes('/pages/')) {
            const page = id.split('/pages/')[1].split('.')[0]
            return `page-${page.toLowerCase()}`
          }
          
          // Feature-based chunks - for better caching
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
          
          // UI components - shared across features
          if (id.includes('/components/ui/')) {
            return 'ui-components'
          }
          
          // Hooks and utilities
          if (id.includes('/hooks/') || id.includes('/utils/') || id.includes('/lib/')) {
            return 'app-utils'
          }
          
          // Header component - loaded on every page
          if (id.includes('/components/Header')) {
            return 'Header'
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
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      '@supabase/supabase-js', 
      'lucide-react', 
      'date-fns',
      'react-i18next',
      'i18next',
      '@radix-ui/react-icons'
    ],
    exclude: [
      // Exclude heavy libraries that should be lazy loaded
      '@monaco-editor/react',
      'chart.js'
    ],
    force: false,
    esbuildOptions: {
      target: 'esnext',
      supported: {
        'top-level-await': true
      }
    }
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
