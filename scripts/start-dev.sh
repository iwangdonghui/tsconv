#!/bin/bash

echo "🚀 启动本地开发服务器..."
echo ""

# 设置环境变量
export NODE_ENV=development
export RATE_LIMITING_ENABLED=false
export CACHING_ENABLED=true
export REDIS_ENABLED=false
export LOG_LEVEL=debug

echo "📋 环境配置:"
echo "- NODE_ENV: $NODE_ENV"
echo "- 速率限制: $([ "$RATE_LIMITING_ENABLED" = "true" ] && echo "启用" || echo "禁用")"
echo "- 缓存: $([ "$CACHING_ENABLED" = "true" ] && echo "启用 (内存缓存)" || echo "禁用")"
echo "- Redis: $([ "$REDIS_ENABLED" = "true" ] && echo "启用" || echo "禁用")"
echo "- 日志级别: $LOG_LEVEL"
echo ""

echo "🌐 API端点将在以下地址可用:"
echo "- http://localhost:3000/api/health"
echo "- http://localhost:3000/api/convert"
echo "- http://localhost:3000/api/timezone-convert"
echo "- http://localhost:3000/api/batch-convert"
echo "- http://localhost:3000/api/timezone-info"
echo "- http://localhost:3000/api/formats"
echo "- http://localhost:3000/api/timezone-difference"
echo "- http://localhost:3000/api/visualization"
echo ""

echo "⚡ 启动Vercel开发服务器..."
npx vercel dev --port 3000