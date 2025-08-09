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
        manualChunks: (id) => {
          // Vendor chunks for better caching
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }

            // Router
            if (id.includes('react-router')) {
              return 'vendor-router';
            }

            // Icons
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }

            // UI libraries
            if (id.includes('@radix-ui') || id.includes('radix')) {
              return 'vendor-ui';
            }

            // Utilities
            if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
              return 'vendor-utils';
            }

            // Other vendor libraries
            return 'vendor-misc';
          }

          // Component-based chunks
          if (id.includes('/components/')) {
            // Large documentation components
            if (id.includes('EnhancedApiDocs')) {
              return 'docs-enhanced';
            }
            if (id.includes('Guide')) {
              return 'content-guide';
            }
            if (id.includes('HowTo')) {
              return 'content-howto';
            }

            // Calculator components
            if (id.includes('Calculator')) {
              return 'tools-calculators';
            }

            // Core converter components
            if (id.includes('TimestampConverter') || id.includes('FormatTool')) {
              return 'tools-converters';
            }

            // UI components
            if (id.includes('/ui/')) {
              return 'ui-components';
            }
          }

          // Context and hooks
          if (id.includes('/contexts/') || id.includes('/hooks/')) {
            return 'app-core';
          }

          // Utils and services
          if (id.includes('/utils/') || id.includes('/services/')) {
            return 'app-utils';
          }
        }
      }
    },
    // Enable source maps for better debugging
    sourcemap: true,
    // Chunk size optimization
    chunkSizeWarningLimit: 300
  },
  optimizeDeps: {
    // Pre-bundle lucide-react for better performance and tree shaking
    include: ['lucide-react']
  }
})
