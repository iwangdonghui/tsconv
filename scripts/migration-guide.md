# 🔄 从 Vercel 到 Cloudflare Pages 迁移指南

## 📋 迁移检查清单

### ✅ 阶段 1: 准备和测试 (当前)

- [x] Cloudflare Pages 配置完成
- [x] API 适配器创建完成
- [x] 构建测试通过
- [ ] 部署到 Cloudflare Pages
- [ ] 测试所有 API 端点
- [ ] 性能对比测试

### ⏳ 阶段 2: 域名切换

- [ ] 备份当前 DNS 设置
- [ ] 在 Cloudflare 中添加自定义域名
- [ ] 更新 DNS 记录
- [ ] 验证 SSL 证书
- [ ] 测试域名访问

### 🗑️ 阶段 3: 清理

- [ ] 监控 1 周确保稳定
- [ ] 删除 Vercel 项目
- [ ] 更新文档和链接

## 🚀 详细步骤

### 步骤 1: 部署到 Cloudflare

```bash
# 1. 登录 Cloudflare
npx wrangler login

# 2. 部署项目
npm run deploy:cloudflare

# 3. 记录获得的 URL (类似: https://tsconv.pages.dev)
```

### 步骤 2: 测试 API 端点

```bash
# 测试基础 API (替换为你的 Cloudflare URL)
CLOUDFLARE_URL="https://your-project.pages.dev"

# 测试转换 API
curl "$CLOUDFLARE_URL/api/convert?timestamp=1640995200"

# 测试当前时间 API
curl "$CLOUDFLARE_URL/api/now"

# 测试健康检查
curl "$CLOUDFLARE_URL/api/health"

# 测试 V1 API
curl -X POST "$CLOUDFLARE_URL/api/v1/convert" \
  -H "Content-Type: application/json" \
  -d '{"timestamp": 1640995200}'
```

### 步骤 3: 性能对比

```bash
# 对比响应时间
echo "Testing Vercel..."
time curl -s "https://your-vercel-domain.com/api/now" > /dev/null

echo "Testing Cloudflare..."
time curl -s "https://your-project.pages.dev/api/now" > /dev/null
```

### 步骤 4: 域名迁移

#### 4.1 在 Cloudflare Pages 中添加自定义域名

1. 登录 Cloudflare Dashboard
2. 进入 Pages > 你的项目
3. 点击 "Custom domains"
4. 添加你的域名 (例如: `your-domain.com`)

#### 4.2 更新 DNS 记录

```
# 如果你的域名在 Cloudflare 管理:
# 自动配置，无需手动操作

# 如果域名在其他服务商:
# 添加 CNAME 记录:
# Name: @ (或 www)
# Value: your-project.pages.dev
```

#### 4.3 验证迁移

```bash
# 检查 DNS 传播
nslookup your-domain.com

# 测试新域名
curl "https://your-domain.com/api/health"
```

## 🔧 环境变量迁移

### 从 Vercel 导出环境变量

1. 登录 Vercel Dashboard
2. 进入项目设置 > Environment Variables
3. 记录所有变量

### 在 Cloudflare 中设置环境变量

1. Cloudflare Dashboard > Pages > 项目 > Settings
2. Environment variables 部分
3. 添加以下变量:

```
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
NODE_ENV=production
```

## 📊 迁移对比

| 方面     | Vercel       | Cloudflare Pages   |
| -------- | ------------ | ------------------ |
| 函数限制 | 12 个 ❌     | 无限制 ✅          |
| 请求量   | 100GB 带宽   | 100,000 请求/天 ✅ |
| 构建时间 | 6000 分钟/月 | 500 构建/月        |
| 全球节点 | 多个         | 更多 ✅            |
| 冷启动   | 较快         | 更快 ✅            |
| 价格     | $20/月 Pro   | 免费 ✅            |

## ⚠️ 注意事项

### 保留 Vercel 项目的原因

1. **快速回滚**: 如果 Cloudflare 出现问题
2. **DNS 传播时间**: 可能需要 24-48 小时
3. **用户缓存**: 一些用户可能仍在访问旧 URL
4. **监控期**: 确保新环境稳定运行

### 何时删除 Vercel 项目

- ✅ Cloudflare 运行 1 周无问题
- ✅ 所有 API 功能正常
- ✅ 性能满足要求
- ✅ 域名完全切换成功
- ✅ 没有用户报告问题

## 🆘 回滚计划

如果需要紧急回滚到 Vercel:

1. 恢复 DNS 记录指向 Vercel
2. 确保 Vercel 项目仍在运行
3. 通知用户 (如果需要)

## 📞 支持

如果遇到问题:

1. 检查 Cloudflare Pages 日志
2. 验证环境变量配置
3. 测试 API 端点响应
4. 检查 DNS 设置

---

**建议**: 在工作日进行迁移，以便及时处理任何问题。
