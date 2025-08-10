# 🔒 安全扫描自动化系统文档

## 概述

本项目集成了全面的安全扫描自动化系统，包括依赖漏洞扫描、代码安全分析、配置安全检查、密钥检测等功能。

## 功能特性

### 🔍 依赖漏洞扫描

自动检测项目依赖中的已知安全漏洞：

- **npm audit**: 官方 npm 漏洞扫描
- **Trivy**: 高级漏洞扫描器
- **Dependabot**: 自动化依赖更新
- **许可证合规性**: 检查依赖许可证兼容性

### 🔎 代码安全分析

静态代码分析检测潜在安全问题：

- **ESLint Security Plugin**: 实时安全代码检查
- **Semgrep**: 高级安全模式检测
- **SonarJS**: 代码质量和安全分析
- **CodeQL**: GitHub 语义代码分析

### 🔐 密钥检测

防止敏感信息泄露：

- **TruffleHog**: Git 历史密钥扫描
- **GitLeaks**: 仓库密钥检测
- **Pre-commit hooks**: 提交前密钥检查
- **环境变量安全**: 配置文件安全检查

### 🏗️ 基础设施安全

配置和基础设施安全检查：

- **安全头检查**: HTTP 安全头配置验证
- **CSP 策略**: 内容安全策略分析
- **HTTPS 配置**: SSL/TLS 配置检查
- **API 安全**: API 端点安全验证

## 使用方法

### 基础使用

#### 运行完整安全扫描
```bash
npm run security:full
```

#### 快速安全检查
```bash
npm run security:quick
```

#### 单独运行各个扫描
```bash
# 依赖漏洞扫描
npm run security:scan

# 配置安全检查
npm run security:config

# 验证安全自动化配置
npm run verify:security
```

### 自动化扫描

#### GitHub Actions 工作流

安全扫描在以下情况自动触发：

- **推送到主分支**: 完整安全扫描
- **Pull Request**: 增量安全检查
- **定时扫描**: 每日凌晨 2 点自动扫描
- **手动触发**: 支持手动运行特定类型的扫描

#### Pre-commit 钩子

每次提交前自动运行：

- 依赖漏洞检查
- 代码安全分析
- 密钥检测
- 格式化和 lint 检查

### 高级配置

#### 自定义扫描配置

在 `scripts/security-scanner.cjs` 中可以配置：

```javascript
const scanConfig = {
  // 漏洞严重性阈值
  vulnerabilityThreshold: {
    critical: 0,    // 不允许严重漏洞
    high: 5,        // 最多 5 个高危漏洞
    moderate: 10,   // 最多 10 个中危漏洞
  },
  
  // 扫描范围
  scanScope: {
    dependencies: true,
    devDependencies: true,
    code: true,
    configuration: true,
    secrets: true,
  },
  
  // 报告格式
  reportFormat: ['json', 'console', 'sarif'],
};
```

#### ESLint 安全规则

在 `.eslintrc.security.json` 中配置安全规则：

```json
{
  "plugins": ["security", "sonarjs"],
  "rules": {
    "security/detect-object-injection": "error",
    "security/detect-non-literal-regexp": "error",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "error",
    "security/detect-child-process": "error",
    "security/detect-disable-mustache-escape": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-non-literal-fs-filename": "error",
    "security/detect-non-literal-require": "error",
    "security/detect-possible-timing-attacks": "error",
    "security/detect-pseudoRandomBytes": "error"
  }
}
```

## 扫描结果解读

### 安全评分

系统会生成 0-100 的安全评分：

- **90-100**: 优秀 - 安全状况良好
- **80-89**: 良好 - 有少量需要关注的问题
- **70-79**: 一般 - 存在一些安全问题需要修复
- **60-69**: 较差 - 存在较多安全问题
- **0-59**: 危险 - 存在严重安全问题，需要立即处理

### 漏洞严重性

- **Critical (严重)**: 立即修复，可能导致系统完全妥协
- **High (高危)**: 尽快修复，可能导致重要数据泄露
- **Moderate (中危)**: 计划修复，可能导致部分功能受影响
- **Low (低危)**: 可选修复，影响较小

### 报告文件

扫描完成后会生成以下报告文件：

- `security-scan-report.json`: 完整扫描报告
- `security-config-report.json`: 配置安全报告
- `audit-report.json`: 依赖审计报告
- `eslint-security.json`: 代码安全分析报告

## 故障排除

### 常见问题

#### 1. 扫描失败
```bash
# 检查依赖是否正确安装
npm install

# 验证安全自动化配置
npm run verify:security

# 查看详细错误信息
npm run security:scan -- --verbose
```

#### 2. 误报处理
```bash
# 查看具体的误报规则
npx eslint . --ext ts,tsx --format json

# 在 .eslintrc.json 中禁用特定规则
{
  "rules": {
    "security/detect-object-injection": "off"
  }
}
```

#### 3. 性能问题
```bash
# 使用快速扫描模式
npm run security:quick

# 排除特定目录
# 在 .eslintignore 中添加：
node_modules/
dist/
build/
```

### 调试工具

#### 详细日志
```bash
# 启用详细日志
DEBUG=security:* npm run security:full

# 查看扫描统计
npm run security:scan -- --stats
```

#### 手动验证
```bash
# 手动运行 npm audit
npm audit --audit-level=moderate

# 手动运行 ESLint 安全检查
npx eslint . --ext ts,tsx --config .eslintrc.security.json

# 检查安全头配置
npm run test-security-headers
```

## 最佳实践

### 开发流程集成

1. **开发前**: 运行 `npm run verify:security` 确保环境配置正确
2. **开发中**: 使用支持 ESLint 的编辑器实时检查安全问题
3. **提交前**: Pre-commit 钩子自动运行安全检查
4. **合并前**: GitHub Actions 自动运行完整安全扫描
5. **部署前**: 确保所有安全检查通过

### 漏洞管理

1. **优先级排序**: 按严重性和影响范围排序
2. **快速响应**: 严重漏洞 24 小时内修复
3. **定期审查**: 每周审查中低危漏洞
4. **文档记录**: 记录修复过程和决策
5. **验证修复**: 修复后重新扫描验证

### 持续改进

1. **定期更新**: 保持扫描工具和规则库最新
2. **规则调优**: 根据项目特点调整扫描规则
3. **团队培训**: 定期进行安全意识培训
4. **流程优化**: 根据扫描结果优化开发流程
5. **指标监控**: 跟踪安全指标趋势

## 相关文件

- `scripts/security-scanner.cjs` - 主要安全扫描脚本
- `scripts/security-config-checker.cjs` - 配置安全检查脚本
- `scripts/verify-security-automation.cjs` - 验证脚本
- `.github/workflows/security-scan.yml` - GitHub Actions 工作流
- `.eslintrc.security.json` - ESLint 安全配置
- `SECURITY.md` - 安全策略文档

## 扩展功能

### 集成第三方工具

可以集成更多安全工具：

- **Snyk**: 商业漏洞扫描服务
- **WhiteSource**: 开源组件安全管理
- **Checkmarx**: 静态应用安全测试
- **OWASP ZAP**: 动态应用安全测试

### 自定义规则

可以添加项目特定的安全规则：

```javascript
// 自定义安全检查
function checkCustomSecurity() {
  // 检查特定的安全模式
  // 例如：API 密钥格式、特定函数使用等
}
```

### 报告集成

可以将扫描结果集成到其他系统：

- **Slack 通知**: 安全问题实时通知
- **Jira 集成**: 自动创建安全任务
- **监控仪表板**: 安全指标可视化
- **邮件报告**: 定期安全状况报告
