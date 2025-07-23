#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 启动本地开发服务器...\n');

// 设置环境变量
process.env.NODE_ENV = 'development';
process.env.RATE_LIMITING_ENABLED = 'false';
process.env.CACHING_ENABLED = 'true';
process.env.REDIS_ENABLED = 'false';
process.env.LOG_LEVEL = 'debug';

console.log('📋 环境配置:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- 速率限制:', process.env.RATE_LIMITING_ENABLED === 'true' ? '启用' : '禁用');
console.log('- 缓存:', process.env.CACHING_ENABLED === 'true' ? '启用 (内存缓存)' : '禁用');
console.log('- Redis:', process.env.REDIS_ENABLED === 'true' ? '启用' : '禁用');
console.log('- 日志级别:', process.env.LOG_LEVEL);
console.log('');

// 启动Vercel开发服务器
const vercelDev = spawn('npx', ['vercel', 'dev', '--port', '3000'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

vercelDev.on('close', (code) => {
  console.log(`\n开发服务器已停止 (退出码: ${code})`);
});

vercelDev.on('error', (err) => {
  console.error('启动开发服务器时出错:', err);
  process.exit(1);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭开发服务器...');
  vercelDev.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n正在关闭开发服务器...');
  vercelDev.kill('SIGTERM');
});