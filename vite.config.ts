/* Vite config for building the frontend react app: https://vite.dev/config/ */
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-oxc'
import reactTest from '@vitejs/plugin-react-swc'
import path, { resolve } from 'path'

// Dev-server history fallback for the React SPA mounted at /sistema.
// Without this, refreshing a deep route (e.g. /sistema/dashboard) hits Vite's
// default SPA fallback to the root index.html (the marketing site).
function sistemaSpaFallback(): Plugin {
  return {
    name: 'sistema-spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = (req.url || '').split('?')[0]
        if (/^\/sistema(\/|$)/.test(url) && !/\.[^/]+$/.test(url)) {
          req.url = '/sistema/index.html'
        }
        next()
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 5173,
    strictPort: false,
  },
  experimental: {
    enableNativePlugin: true
  },
  optimizeDeps: {
    exclude: [
      '@radix-ui/react-toast'
    ],
    include: [
      'jspdf',
      'html2canvas'
    ],
    force: true
  },
  build: {
    minify: mode !== 'development',
    sourcemap: mode === 'development',
    rollupOptions: {
      input: {
        // Site institucional (homepage pública)
        main: resolve(__dirname, 'index.html'),
        'quem-somos': resolve(__dirname, 'quem-somos.html'),
        atividades: resolve(__dirname, 'atividades.html'),
        portfolio: resolve(__dirname, 'portfolio.html'),
        contato: resolve(__dirname, 'contato.html'),
        admin: resolve(__dirname, 'admin.html'),
        // Sistema interno (React app)
        sistema: resolve(__dirname, 'sistema/index.html'),
      },
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return
        }
        warn(warning)
      },
    },
  },
  plugins: [mode === 'test' ? reactTest() : react(), sistemaSpaFallback()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode ?? process.env.NODE_ENV ?? 'production'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
}))
