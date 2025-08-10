# 🔧 Upstash Redis 设置指南

## 📋 设置步骤

### 1. 创建 Upstash 账户

1. 访问 [Upstash Console](https://console.upstash.com/)
2. 使用 GitHub 或 Google 账户登录
3. 选择免费计划 (10,000 命令/天)

### 2. 创建 Redis 数据库

1. 点击 "Create Database"
2. 配置设置：
   ```
   Name: tsconv-cache
   Region: 选择离你用户最近的区域
   Type: Regional (免费)
   Eviction: allkeys-lru (推荐)
   ```
3. 点击 "Create"

### 3. 获取连接信息

创建完成后，你会看到：

```
UPSTASH_REDIS_REST_URL=https://your-region-xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### 4. 在 Cloudflare Pages 中配置环境变量

1. 登录 Cloudflare Dashboard
2. 进入 Pages > tsconv 项目
3. 点击 Settings > Environment variables
4. 添加以下变量：

**Production 环境:**

```
UPSTASH_REDIS_REST_URL = https://your-region-xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN = your-token-here
REDIS_ENABLED = true
```

**Preview 环境:**

```
UPSTASH_REDIS_REST_URL = https://your-region-xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN = your-token-here
REDIS_ENABLED = true
```

## 🔧 本地开发设置

### 1. 创建 .env.local 文件

```bash
# 在项目根目录创建 .env.local
UPSTASH_REDIS_REST_URL=https://your-region-xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
REDIS_ENABLED=true
```

### 2. 添加到 .gitignore

确保 `.env.local` 在 .gitignore 中：

```
.env.local
.env*.local
```

## 📊 免费计划限制

Upstash Redis 免费计划包括：

- **10,000 命令/天**
- **256 MB 存储**
- **全球复制**
- **REST API 访问**
- **无过期时间限制**

对于我们的用例，这完全足够：

- API 响应缓存
- 时区数据缓存
- 格式模板缓存
- 用户会话数据

## 🚀 下一步

完成 Redis 设置后，我们将：

1. 实现 Redis 客户端适配器
2. 添加 API 响应缓存
3. 实现智能缓存策略
4. 监控缓存性能

## 🔍 验证设置

设置完成后，可以使用以下命令测试连接：

```bash
curl -X POST https://your-region-xxxxx.upstash.io/ping \
  -H "Authorization: Bearer your-token-here"
```

应该返回：`{"result":"PONG"}`
