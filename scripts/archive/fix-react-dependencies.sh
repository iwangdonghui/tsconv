#!/bin/bash

# 🔧 React 依赖修复脚本
# 解决 React Hook 依赖冲突和版本兼容性问题

set -e

echo "🔧 修复 React 依赖冲突和版本兼容性问题"
echo "================================================"

# 检查 Node.js 版本
echo "📋 检查环境..."
node_version=$(node -v)
echo "Node.js 版本: $node_version"

if [[ ! "$node_version" =~ ^v1[89] ]]; then
    echo "⚠️  警告: 建议使用 Node.js 18 或 19"
fi

# 清理现有依赖
echo ""
echo "🧹 清理现有依赖..."
rm -rf node_modules
rm -f package-lock.json

# 清理 Vite 缓存
echo "🗑️  清理 Vite 缓存..."
rm -rf .vite
rm -rf dist
rm -rf dist-*

# 重新安装依赖
echo ""
echo "📦 重新安装依赖..."
npm install

# 验证关键依赖版本
echo ""
echo "✅ 验证关键依赖版本..."
echo "React: $(npm list react --depth=0 2>/dev/null | grep react@ || echo '未安装')"
echo "React DOM: $(npm list react-dom --depth=0 2>/dev/null | grep react-dom@ || echo '未安装')"
echo "React Router: $(npm list react-router-dom --depth=0 2>/dev/null | grep react-router-dom@ || echo '未安装')"
echo "Radix Select: $(npm list @radix-ui/react-select --depth=0 2>/dev/null | grep @radix-ui/react-select@ || echo '未安装')"
echo "Radix Tabs: $(npm list @radix-ui/react-tabs --depth=0 2>/dev/null | grep @radix-ui/react-tabs@ || echo '未安装')"

# 运行类型检查
echo ""
echo "🔍 运行类型检查..."
if npm run type-check; then
    echo "✅ 类型检查通过"
else
    echo "❌ 类型检查失败，但继续构建..."
fi

# 测试构建
echo ""
echo "🏗️  测试构建..."
if npm run build:cloudflare; then
    echo "✅ 构建成功"
else
    echo "❌ 构建失败"
    exit 1
fi

# 检查构建输出
echo ""
echo "📊 检查构建输出..."
if [ -f "dist/index.html" ]; then
    echo "✅ index.html 已生成"
    
    # 检查关键资源
    if grep -q "assets.*\.js" dist/index.html; then
        echo "✅ JavaScript 资源已注入"
    else
        echo "❌ JavaScript 资源未找到"
    fi
    
    if grep -q "assets.*\.css" dist/index.html; then
        echo "✅ CSS 资源已注入"
    else
        echo "❌ CSS 资源未找到"
    fi
else
    echo "❌ index.html 未生成"
    exit 1
fi

echo ""
echo "🎉 依赖修复完成！"
echo ""
echo "📋 下一步操作："
echo "1. 运行 'npm run preview:cloudflare' 本地测试"
echo "2. 运行 'npm run deploy:cloudflare' 部署到 Cloudflare"
echo "3. 检查浏览器控制台确认没有错误"
echo ""
echo "🔍 如果仍有问题，请检查："
echo "- 浏览器控制台的 JavaScript 错误"
echo "- 网络面板的资源加载状态"
echo "- Cloudflare Pages 的部署日志"
