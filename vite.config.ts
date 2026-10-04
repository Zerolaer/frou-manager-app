import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { handleFinanceAiChat } from './server/financeAiDevHandler'
import { handleCanvasAiLayout } from './server/canvasAiDevHandler'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
  plugins: [
    {
      name: 'finance-ai-dev-api',
      configureServer(server) {
        const register = (middlewares: typeof server.middlewares) => {
          middlewares.use('/api/finance-ai-chat', (req, res) => {
            void handleFinanceAiChat(req, res, env)
          })
          middlewares.use('/api/canvas-ai-layout', (req, res) => {
            void handleCanvasAiLayout(req, res, env)
          })
        }
        register(server.middlewares)
      },
      configurePreviewServer(server) {
        server.middlewares.use('/api/finance-ai-chat', (req, res) => {
          void handleFinanceAiChat(req, res, env)
        })
        server.middlewares.use('/api/canvas-ai-layout', (req, res) => {
          void handleCanvasAiLayout(req, res, env)
        })
      },
    },
    react({
      // Enable React Fast Refresh
      fastRefresh: true,
      // Use automatic JSX runtime
      jsxRuntime: 'automatic',
      // Optimize React imports
      babel: {
        plugins: []
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    // Ensure proper module resolution for dynamic imports
    preserveSymlinks: false
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Don't code-split React - keep it in main bundle to ensure it's always available
          if (id.includes('node_modules')) {
            // Keep React and react-router-dom in main bundle - don't split them
            // This ensures React is always available when lazy-loaded components need it
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler') || id.includes('react/jsx-runtime') || id.includes('react-router')) {
              // Return undefined to keep in main bundle
              return
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            if (id.includes('date-fns')) {
              return 'vendor-date'
            }
            return 'vendor-other'
          }
        }
      }
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router',
      'react-router-dom', 
      '@supabase/supabase-js', 
      'lucide-react', 
      'date-fns',
      'react-i18next',
      'i18next',
      'i18next-browser-languagedetector',
      '@radix-ui/react-icons'
    ],
    exclude: [
      // Exclude heavy libraries that should be lazy loaded
      '@monaco-editor/react',
      'chart.js'
    ],
    esbuildOptions: {
      target: 'esnext',
      supported: {
        'top-level-await': true
      }
    },
    // Better handling of dynamic imports
    entries: [
      'src/main.tsx',
      'src/pages/**/*.tsx'
    ]
  },
  server: {
    fs: {
      strict: true
    },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff'
    },
    cors: false,
    port: 5173,
    strictPort: false,
  },
  // Ensure React is always available - important for Cursor browser compatibility
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
    drop: mode === 'production' ? ['console', 'debugger'] : []
  }
}
})
