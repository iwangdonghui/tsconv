import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
  build: {
    outDir: 'dist-debug',
    sourcemap: true, // 启用源映射以便调试
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'debug-index.html'),
      },
    },
  },
});
