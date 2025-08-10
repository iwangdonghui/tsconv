# 性能监控系统文档

## 概述

本项目集成了全面的性能监控系统，包括 Web
Vitals 监控、自定义性能指标收集、资源时序监控等功能。

## 功能特性

### 🎯 Core Web Vitals 监控

自动监控 Google 推荐的核心 Web 性能指标：

- **LCP (Largest Contentful Paint)**: 最大内容绘制时间
- **INP (Interaction to Next Paint)**: 交互到下次绘制
- **CLS (Cumulative Layout Shift)**: 累积布局偏移
- **FCP (First Contentful Paint)**: 首次内容绘制
- **TTFB (Time to First Byte)**: 首字节时间

### 📊 自定义性能指标

- 页面加载时间
- DOM 内容加载时间
- 首次交互时间
- API 响应时间统计
- 内存使用监控
- 长任务检测

### 🔍 资源监控

- 慢资源加载检测
- API 调用性能追踪
- 导航时序分析
- 用户时序标记

### 📈 实时监控面板

开发环境提供实时性能监控面板，显示：

- Web Vitals 实时数据
- 自定义指标统计
- API 响应时间
- 内存使用情况

## 使用方法

### 基础使用

性能监控在应用启动时自动初始化：

```typescript
import { initializePerformanceMonitoring } from './lib/performance-monitoring';

// 自动初始化（在 main.tsx 中）
initializePerformanceMonitoring({
  enableWebVitals: true,
  enableCustomMetrics: true,
  reportToSentry: true,
  sampleRate: 0.1, // 生产环境采样率 10%
});
```

### 在组件中使用

```typescript
import { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring';

function MyComponent() {
  const { markStart, markEnd, measureTime, startApiTimer } = usePerformanceMonitoring({
    componentName: 'MyComponent',
    trackRenders: true,
    trackEffects: true,
  });

  const handleApiCall = async () => {
    const endTimer = startApiTimer('/api/data');

    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      return data;
    } finally {
      endTimer(); // 自动记录 API 响应时间
    }
  };

  return <div>...</div>;
}
```

### 手动标记时序

```typescript
import { markTiming, measureTiming } from './lib/performance-monitoring';

// 标记开始时间
markTiming('data-processing-start');

// 执行数据处理
await processData();

// 标记结束时间并测量
markTiming('data-processing-end');
measureTiming(
  'data-processing',
  'data-processing-start',
  'data-processing-end'
);
```

### API 响应时间追踪

```typescript
import { trackApiResponseTime } from './lib/performance-monitoring';

// 手动追踪 API 响应时间
const startTime = performance.now();
const response = await fetch('/api/endpoint');
const duration = performance.now() - startTime;
trackApiResponseTime('/api/endpoint', duration);
```

## 配置选项

### 环境配置

```typescript
// 开发环境配置
const developmentConfig = {
  enableWebVitals: true,
  enableCustomMetrics: true,
  enableResourceTiming: true,
  enableMemoryMonitoring: true,
  reportToSentry: true,
  reportToConsole: true,
  sampleRate: 1.0, // 100% 采样
};

// 生产环境配置
const productionConfig = {
  enableWebVitals: true,
  enableCustomMetrics: true,
  enableResourceTiming: true,
  enableMemoryMonitoring: false, // 生产环境关闭内存监控
  reportToSentry: true,
  reportToConsole: false,
  sampleRate: 0.1, // 10% 采样
};
```

### 性能阈值

```typescript
const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // 毫秒
  FID: { good: 100, poor: 300 }, // 毫秒
  CLS: { good: 0.1, poor: 0.25 }, // 分数
  FCP: { good: 1800, poor: 3000 }, // 毫秒
  TTFB: { good: 800, poor: 1800 }, // 毫秒
  API_RESPONSE: { good: 500, poor: 2000 }, // 毫秒
  MEMORY_USAGE: { good: 50, poor: 80 }, // 百分比
};
```

## 监控面板

### 开发环境面板

在开发环境中，页面左下角会显示性能监控面板：

1. **Web Vitals 指标**: 显示实时的核心性能指标
2. **自定义指标**: 页面加载时间、DOM 就绪时间等
3. **API 响应时间**: 各个 API 端点的平均响应时间
4. **内存使用**: 当前 JavaScript 堆内存使用情况

### 面板操作

- **展开/收起**: 点击眼睛图标
- **日志数据**: 点击 "Log Data" 按钮将数据输出到控制台
- **清除数据**: 点击 "Clear" 按钮清除当前收集的指标

## 数据报告

### Sentry 集成

性能数据自动报告到 Sentry：

- **性能问题**: 当指标超过阈值时自动报告
- **面包屑**: 所有性能事件作为面包屑记录
- **上下文信息**: 包含设备信息、连接类型等

### 控制台输出

开发环境中，性能指标会输出到浏览器控制台：

```
📊 Performance Metric: LCP {value: 1234, rating: 'good', url: '/'}
🐌 Slow API request: /api/convert took 1500.23ms
💾 Memory usage: 45MB / 128MB (35%)
```

## 性能优化建议

### 基于监控数据的优化

1. **LCP 优化**:
   - 优化关键资源加载
   - 使用 CDN 加速
   - 压缩图片和字体

2. **FID 优化**:
   - 减少 JavaScript 执行时间
   - 使用 Web Workers
   - 代码分割和懒加载

3. **CLS 优化**:
   - 为图片和广告预留空间
   - 避免动态插入内容
   - 使用 CSS 变换而非布局变化

4. **API 响应优化**:
   - 实现缓存策略
   - 优化数据库查询
   - 使用 CDN 和边缘计算

### 监控告警

系统会在以下情况发出告警：

- Web Vitals 指标超过 "poor" 阈值
- API 响应时间超过 2 秒
- 内存使用超过 80%
- 检测到长任务（>50ms）

## 故障排除

### 常见问题

1. **性能监控未初始化**:

   ```
   console.log('Sentry available:', typeof window.Sentry !== 'undefined');
   console.log('Performance monitor:', window.performanceMonitor);
   ```

2. **Web Vitals 数据缺失**:
   - 检查浏览器兼容性
   - 确认用户交互已发生
   - 验证采样率设置

3. **内存监控不工作**:
   - 检查浏览器是否支持 `performance.memory`
   - 确认在 HTTPS 环境下运行

### 调试工具

开发环境中可以使用以下调试工具：

```javascript
// 获取性能监控实例
const monitor = window.performanceMonitor;

// 查看当前指标
console.log(monitor.getPerformanceSummary());

// 清除指标
monitor.clearMetrics();

// 手动触发指标收集
markTiming('debug-test');
```

## 最佳实践

1. **合理设置采样率**: 生产环境建议 10-20%
2. **关注核心指标**: 优先优化 LCP、FID、CLS
3. **定期审查数据**: 建立性能监控仪表板
4. **设置告警阈值**: 及时发现性能问题
5. **结合用户反馈**: 性能数据与用户体验相结合

## 相关文件

- `src/lib/performance-monitoring.ts` - 核心监控逻辑
- `src/hooks/usePerformanceMonitoring.ts` - React Hook
- `src/components/PerformanceMonitoringDashboard.tsx` - 监控面板
- `src/config/performance.ts` - 配置文件
- `docs/performance-monitoring.md` - 本文档
