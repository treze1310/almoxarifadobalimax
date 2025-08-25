/* Vite config for building the frontend react app: https://vite.dev/config/ */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-oxc'
import reactTest from '@vitejs/plugin-react-swc'
import path from 'path'

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
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return
        }
        warn(warning)
      },
    },
  },
  plugins: [mode === 'test' ? reactTest() : react()],
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
