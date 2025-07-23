# API 使用示例

本文档展示了如何使用时间戳转换器的各种API端点。

## 启动开发服务器

```bash
# 只启动API服务器
npm run dev:api

# 同时启动前端和API服务器
npm run dev:full

# 测试所有API端点
npm run test:api
```

服务器启动后，API将在 `http://localhost:3000/api/` 下可用。

## API端点示例

### 1. 健康检查

```bash
curl http://localhost:3000/api/health
```

**响应:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": 1642248600,
    "services": {
      "cache": { "status": "healthy", "type": "memory" },
      "timezone": { "status": "healthy" }
    }
  }
}
```

### 2. 基础时间戳转换

```bash
curl "http://localhost:3000/api/convert?timestamp=1642248600"
```

**响应:**
```json
{
  "success": true,
  "data": {
    "timestamp": 1642248600,
    "iso8601": "2022-01-15T14:30:00.000Z",
    "utc": "Sat, 15 Jan 2022 14:30:00 GMT",
    "local": "1/15/2022, 2:30:00 PM"
  }
}
```

### 3. 时区转换

```bash
curl "http://localhost:3000/api/timezone-convert?timestamp=1642248600&fromTimezone=UTC&toTimezone=America/New_York"
```

**响应:**
```json
{
  "success": true,
  "data": {
    "originalTimestamp": 1642248600,
    "convertedTimestamp": 1642230600,
    "originalDate": "2022-01-15T14:30:00.000Z",
    "convertedDate": "2022-01-15T09:30:00.000Z",
    "fromTimezone": "UTC",
    "toTimezone": "America/New_York",
    "offsetDifference": -300
  }
}
```

### 4. 时区信息

```bash
# 获取特定时区信息
curl "http://localhost:3000/api/timezone-info?timezone=America/New_York"

# 获取常用时区列表
curl "http://localhost:3000/api/timezone-info?list=true"
```

**响应:**
```json
{
  "success": true,
  "data": {
    "identifier": "America/New_York",
    "displayName": "Eastern Time (US & Canada)",
    "currentOffset": -300,
    "isDST": false,
    "region": "America",
    "countryCode": "US",
    "aliases": ["EST", "EDT"]
  }
}
```

### 5. 支持的格式

```bash
curl http://localhost:3000/api/formats
```

**响应:**
```json
{
  "success": true,
  "data": {
    "formats": [
      {
        "name": "ISO 8601",
        "pattern": "YYYY-MM-DDTHH:mm:ss.sssZ",
        "example": "2024-01-15T14:30:00.000Z",
        "category": "standard"
      },
      {
        "name": "Unix Timestamp",
        "pattern": "X",
        "example": "1642248600",
        "category": "standard"
      }
    ]
  }
}
```

### 6. 批量转换

```bash
curl -X POST http://localhost:3000/api/batch-convert \
  -H "Content-Type: application/json" \
  -d '{
    "items": [1642248600, 1642335000, "2022-01-16T10:00:00Z"],
    "outputFormats": ["iso8601", "unix-timestamp", "us-date"],
    "timezone": "America/New_York"
  }'
```

**响应:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "input": 1642248600,
        "success": true,
        "data": {
          "timestamp": 1642248600,
          "formats": {
            "iso8601": "2022-01-15T14:30:00.000Z",
            "unix-timestamp": "1642248600",
            "us-date": "01/15/2022"
          }
        }
      }
    ],
    "summary": {
      "total": 3,
      "processed": 3,
      "successful": 3,
      "failed": 0
    }
  }
}
```

### 7. 时区差异

```bash
curl "http://localhost:3000/api/timezone-difference?from=UTC&to=America/New_York&includeHistorical=true"
```

**响应:**
```json
{
  "success": true,
  "data": {
    "difference": {
      "fromTimezone": "UTC",
      "toTimezone": "America/New_York",
      "currentOffset": -300,
      "offsetHours": 5,
      "offsetMinutes": 0,
      "direction": "behind",
      "isDST": {
        "from": false,
        "to": false
      }
    }
  }
}
```

### 8. 可视化数据

```bash
# 时区地图数据
curl "http://localhost:3000/api/visualization?type=timezone-map"

# 时区对比图表
curl "http://localhost:3000/api/visualization?type=timezone-chart&fromTimezone=UTC&toTimezone=America/New_York"

# 时间戳分布
curl "http://localhost:3000/api/visualization?type=timestamp-distribution&timestamps=1642248600,1642335000,1642421400"
```

## 错误处理

所有API都返回标准化的错误响应：

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid timezone parameter",
    "timestamp": 1642248600,
    "requestId": "req_abc123",
    "path": "/api/timezone-convert",
    "method": "GET"
  }
}
```

## 常见错误代码

- `BAD_REQUEST` (400): 请求参数无效
- `NOT_FOUND` (404): 资源未找到
- `VALIDATION_ERROR` (422): 数据验证失败
- `RATE_LIMITED` (429): 请求频率过高
- `INTERNAL_ERROR` (500): 服务器内部错误

## 开发提示

1. **本地开发**: 使用 `npm run dev:api` 启动API服务器
2. **测试**: 使用 `npm run test:api` 运行自动化测试
3. **调试**: 设置 `LOG_LEVEL=debug` 获取详细日志
4. **缓存**: 本地开发使用内存缓存，无需Redis
5. **速率限制**: 本地开发默认禁用速率限制

## 生产部署

部署到Vercel后，API将在以下地址可用：
```
https://your-domain.vercel.app/api/[endpoint]
```

确保设置正确的环境变量：
- `REDIS_URL`: Redis连接字符串（生产环境）
- `RATE_LIMITING_ENABLED`: 启用速率限制
- `CACHING_ENABLED`: 启用缓存