import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  build: {
    // Enable strict mode for production builds
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return
        // Treat warnings as errors in strict mode
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Build warning: ${warning.message}`)
        }
        warn(warning)
      },
      output: {
        manualChunks: {
          // Separate lucide-react icons into their own chunk for better caching
          'lucide-icons': ['lucide-react']
        }
      }
    },
    // Enable source maps for better debugging
    sourcemap: true,
    // Strict chunk size warnings
    chunkSizeWarningLimit: 500
  },
  optimizeDeps: {
    // Pre-bundle lucide-react for better performance and tree shaking
    include: ['lucide-react']
  }
})
