import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 确保单一 React 实例
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
  build: {
    outDir: 'dist-minimal',
    // 简化构建配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // 保留 console 用于调试
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.minimal.html'),
      },
      output: {
        // 简化的代码分割
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
    sourcemap: true,
  },
  optimizeDeps: {
    // 只包含基本依赖
    include: ['react', 'react-dom'],
    force: true,
  },
});
