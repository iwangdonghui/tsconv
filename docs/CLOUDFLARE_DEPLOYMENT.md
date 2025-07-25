# 🚀 Cloudflare Pages 部署指南

## 为什么选择 Cloudflare Pages？

由于 Vercel Hobby 计划限制最多 12 个 Serverless Functions，而我们的项目有更多的 API 端点，Cloudflare Pages 是一个更好的选择：

### ✅ Cloudflare Pages 优势
- **无函数数量限制** (在合理范围内)
- **100,000 请求/天** (免费计划)
- **无限带宽**
- **全球 CDN** (更多节点)
- **更好的性能**

## 🔧 部署步骤

### 1. 安装依赖
```bash
npm install
```

### 2. 构建项目
```bash
npm run build:cloudflare
```

### 3. 安装 Wrangler CLI (如果还没有)
```bash
npm install -g wrangler
# 或者使用项目本地版本
npx wrangler --version
```

### 4. 登录 Cloudflare
```bash
npx wrangler login
```

### 5. 部署到 Cloudflare Pages
```bash
npm run deploy:cloudflare
```

### 6. 本地预览 (可选)
```bash
npm run preview:cloudflare
```

## 🌐 API 端点

部署后，你的 API 将在以下端点可用：

### 核心 API
- `GET/POST /api/convert` - 时间戳转换
- `GET /api/now` - 当前时间戳
- `GET /api/health` - 健康检查

### V1 API (增强功能)
- `POST /api/v1/convert` - 增强转换功能
- `POST /api/v1/batch` - 批量转换
- `GET /api/v1/formats` - 支持的格式
- `GET /api/v1/timezones` - 支持的时区
- `GET /api/v1/health` - V1 健康检查

### 管理 API (需要认证)
- `GET /api/admin/stats` - 使用统计
- `GET/DELETE /api/admin/cache` - 缓存管理
- `GET /api/admin/health` - 详细健康检查

## 🔐 环境变量配置

在 Cloudflare Pages 控制台中设置以下环境变量：

### 生产环境
```
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
NODE_ENV=production
```

### 预览环境
```
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
NODE_ENV=development
```

## 📝 配置文件说明

### `wrangler.toml`
Cloudflare Pages 的主要配置文件，包含：
- 项目名称和兼容性日期
- 构建输出目录
- 环境变量配置

### `functions/api/[[path]].ts`
统一的 API 处理器，处理所有 `/api/*` 路由，避免函数数量限制。

### `api-handlers/`
适配 Cloudflare Pages 的 API 处理器，从原始 Vercel API 代码转换而来。

## 🔄 从 Vercel 迁移的变化

1. **函数结构**: 从多个独立函数合并为单个路由处理器
2. **请求/响应**: 从 Vercel 的 `VercelRequest/VercelResponse` 改为标准 `Request/Response`
3. **环境变量**: 通过 `context.env` 访问而不是 `process.env`
4. **部署命令**: 使用 `wrangler` 而不是 `vercel`

## 🚀 自动部署

你可以连接 GitHub 仓库到 Cloudflare Pages 实现自动部署：

1. 登录 Cloudflare Dashboard
2. 进入 Pages 部分
3. 连接 GitHub 仓库
4. 设置构建命令: `npm run build:cloudflare`
5. 设置输出目录: `dist`
6. 配置环境变量

## 📊 监控和日志

- **实时日志**: `npx wrangler pages deployment tail`
- **分析**: Cloudflare Dashboard > Pages > Analytics
- **性能**: Cloudflare Dashboard > Speed > Optimization

## 🔧 故障排除

### 常见问题

1. **构建失败**: 检查 TypeScript 编译错误
2. **API 不工作**: 检查环境变量配置
3. **CORS 错误**: 已在代码中处理，应该不会出现

### 调试命令
```bash
# 查看部署日志
npx wrangler pages deployment list

# 查看实时日志
npx wrangler pages deployment tail

# 本地调试
npm run preview:cloudflare
```

## 🎉 完成！

部署成功后，你的时间戳转换工具将在 Cloudflare 的全球网络上运行，享受更好的性能和无函数数量限制！
