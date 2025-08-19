import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react({
      // Ensure proper JSX runtime for production builds
      jsxRuntime: 'automatic',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Ensure single React instance
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/api/, '/api'),
      },
    },
  },
  build: {
    // Enable strict mode for production builds
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        // Treat warnings as errors in strict mode
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Build warning: ${warning.message}`);
        }
        warn(warning);
      },
      output: {
        manualChunks: id => {
          // Vendor chunks for better caching
          if (id.includes('node_modules')) {
            // React ecosystem - keep all React-related packages together
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('use-callback-ref') ||
              id.includes('react-remove-scroll')
            ) {
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
            if (
              id.includes('clsx') ||
              id.includes('tailwind-merge') ||
              id.includes('class-variance-authority')
            ) {
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
        },

        // Optimize asset file names with better organization
        assetFileNames: assetInfo => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];

          // Image assets
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(ext)) {
            // Optimized images go to optimized folder
            if (
              assetInfo.name.includes('optimized') ||
              assetInfo.name.includes('webp') ||
              assetInfo.name.includes('avif')
            ) {
              return `assets/images/optimized/[name]-[hash][extname]`;
            }
            return `assets/images/[name]-[hash][extname]`;
          }

          // CSS assets
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`;
          }

          // Font assets
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }

          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Enable source maps for better debugging
    sourcemap: true,
    // Chunk size optimization
    chunkSizeWarningLimit: 300,
  },
  optimizeDeps: {
    // Pre-bundle dependencies for better performance and compatibility
    include: [
      'lucide-react',
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'react-router-dom',
      'use-callback-ref',
      'react-remove-scroll',
    ],
    // Force optimization of problematic dependencies
    force: true,
    // Ensure React is available globally
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  // Force production JSX runtime even in edge build environments
  esbuild: {
    jsx: 'automatic',
    jsxDev: false,
  },
  define: {
    // Define environment variables for browser
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.REDIS_URL': JSON.stringify(process.env.REDIS_URL || ''),
    'process.env.KV_URL': JSON.stringify(process.env.KV_URL || ''),
    // Ensure global is available for React JSX runtime
    global: 'globalThis',
  },
});
