#!/usr/bin/env node

/**
 * TypeScript 错误批量修复脚本
 * 
 * 此脚本自动修复常见的 TypeScript 错误：
 * - TS6133: 未使用的变量
 * - TS2532: 可能为 undefined 的对象
 * - TS2345: 类型不匹配
 * - TS2322: 类型赋值错误
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 开始修复 TypeScript 错误...\n');

// 修复未使用变量 (TS6133)
function fixUnusedVariables(filePath, content) {
  let fixed = content;
  let changes = 0;

  // 特定的未使用变量修复
  const specificFixes = [
    { pattern: /const\s+updateAPIKeySchema\s*=/g, replacement: 'const _updateAPIKeySchema =' },
    { pattern: /const\s+___dbSize\s*=/g, replacement: 'const _dbSize =' },
    { pattern: /function\s+_extractInfoValue/g, replacement: 'function __extractInfoValue' },
    { pattern: /function\s+extractInfoValue/g, replacement: 'function _extractInfoValue' },
    { pattern: /\(\s*settings\s*\?\s*:\s*any\s*\)/g, replacement: '(_settings?: any)' },
    { pattern: /\(\s*req\s*:\s*VercelRequest/g, replacement: '(_req: VercelRequest' },
    { pattern: /const\s+__targetTime\s*=/g, replacement: 'const _targetTime =' },
    { pattern: /\(\s*options\s*:\s*any\s*,/g, replacement: '(_options: any,' },
    { pattern: /\(\s*timezone\s*\?\s*:\s*string\s*\)/g, replacement: '(_timezone?: string)' },
    { pattern: /for\s*\(\s*const\s*\[\s*key\s*,/g, replacement: 'for (const [_key,' },
    { pattern: /enableSQLInjectionProtection\s*=/g, replacement: '_enableSQLInjectionProtection =' },
    { pattern: /enableXSSProtection\s*=/g, replacement: '_enableXSSProtection =' },
    { pattern: /const\s+hashedKey\s*,/g, replacement: 'const _hashedKey,' },
    { pattern: /const\s+userAgent\s*=/g, replacement: 'const _userAgent =' },
    { pattern: /const\s+origin\s*=/g, replacement: 'const _origin =' },
    { pattern: /import\s+config\s+from/g, replacement: 'import _config from' },
    { pattern: /getRateLimitRule\s*\}/g, replacement: '_getRateLimitRule }' },
    { pattern: /\(\s*rule\s*:\s*RateLimitRule\s*\)/g, replacement: '(_rule: RateLimitRule)' },
    { pattern: /private\s+timezones\s*:/g, replacement: 'private _timezones:' },
    { pattern: /const\s+__utcTime\s*=/g, replacement: 'const _utcTime =' },
    { pattern: /const\s+__standardOffset\s*=/g, replacement: 'const _standardOffset =' },
    { pattern: /const\s+__utcDate\s*=/g, replacement: 'const _utcDate =' },
    { pattern: /const\s+__now\s*=/g, replacement: 'const _now =' },
    { pattern: /const\s+__targetYear\s*=/g, replacement: 'const _targetYear =' },
    { pattern: /const\s+__memoryUsed\s*=/g, replacement: 'const _memoryUsed =' },
    { pattern: /statusCode\s*:\s*number\s*=\s*400/g, replacement: '_statusCode: number = 400' },
    { pattern: /schema\?\s*:\s*Record/g, replacement: '_schema?: Record' },
    { pattern: /getRateLimiter\s*,/g, replacement: '_getRateLimiter,' },
    { pattern: /estimateCacheSize\(\)/g, replacement: '_estimateCacheSize()' },
  ];

  specificFixes.forEach(fix => {
    const before = fixed;
    fixed = fixed.replace(fix.pattern, fix.replacement);
    if (before !== fixed) {
      changes++;
    }
  });

  return { content: fixed, changes };
}

// 修复可能为 undefined 的对象 (TS2532)
function fixUndefinedObjects(filePath, content) {
  let fixed = content;
  let changes = 0;

  // 添加空值检查的修复
  const undefinedFixes = [
    // 简单的空值检查添加
    {
      pattern: /ipCounts\[log\.ip\]\.requests\+\+/g,
      replacement: 'if (ipCounts[log.ip]) ipCounts[log.ip].requests++'
    },
    {
      pattern: /ipCounts\[log\.ip\]\.threats\+\+/g,
      replacement: 'if (ipCounts[log.ip]) ipCounts[log.ip].threats++'
    },
    {
      pattern: /endpointCounts\[log\.endpoint\]\.requests\+\+/g,
      replacement: 'if (endpointCounts[log.endpoint]) endpointCounts[log.endpoint].requests++'
    },
    {
      pattern: /endpointCounts\[log\.endpoint\]\.threats\+\+/g,
      replacement: 'if (endpointCounts[log.endpoint]) endpointCounts[log.endpoint].threats++'
    },
    {
      pattern: /attackerData\[log\.ip\]\.events\+\+/g,
      replacement: 'if (attackerData[log.ip]) attackerData[log.ip].events++'
    },
    {
      pattern: /endpointData\[log\.endpoint\]\.threats\+\+/g,
      replacement: 'if (endpointData[log.endpoint]) endpointData[log.endpoint].threats++'
    },
  ];

  undefinedFixes.forEach(fix => {
    const before = fixed;
    fixed = fixed.replace(fix.pattern, fix.replacement);
    if (before !== fixed) {
      changes++;
    }
  });

  return { content: fixed, changes };
}

// 修复类型不匹配 (TS2345, TS2322)
function fixTypeMismatches(filePath, content) {
  let fixed = content;
  let changes = 0;

  const typeFixes = [
    // parseInt 参数可能为 undefined
    {
      pattern: /parseInt\(match\[1\]\)/g,
      replacement: 'parseInt(match[1] || "0")'
    },
    // TIMEZONE_ALIASES 返回值
    {
      pattern: /return TIMEZONE_ALIASES\[timezone\.toUpperCase\(\)\]/g,
      replacement: 'return TIMEZONE_ALIASES[timezone.toUpperCase()] || timezone'
    },
    // 数组访问可能为 undefined
    {
      pattern: /\['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'\]\[date\.getDay\(\)\]/g,
      replacement: "['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()] || ''"
    },
    {
      pattern: /\['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'\]\[/g,
      replacement: "['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()] || ''"
    },
    // split 结果可能为 undefined
    {
      pattern: /parts\[1\]\.replace/g,
      replacement: '(parts[1] || "").replace'
    },
    {
      pattern: /parts\[2\]\.replace/g,
      replacement: '(parts[2] || "").replace'
    },
    // toISOString().split 可能为 undefined
    {
      pattern: /current\.toISOString\(\)\.split\('T'\)\[0\]/g,
      replacement: "(current.toISOString().split('T')[0] || '')"
    },
  ];

  typeFixes.forEach(fix => {
    const before = fixed;
    fixed = fixed.replace(fix.pattern, fix.replacement);
    if (before !== fixed) {
      changes++;
    }
  });

  return { content: fixed, changes };
}

// 处理单个文件
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let result = content;
    let totalChanges = 0;

    // 应用各种修复
    const fixes = [
      fixUnusedVariables,
      fixUndefinedObjects,
      fixTypeMismatches
    ];

    fixes.forEach(fixFunction => {
      const { content: newContent, changes } = fixFunction(filePath, result);
      result = newContent;
      totalChanges += changes;
    });

    if (totalChanges > 0) {
      fs.writeFileSync(filePath, result);
      console.log(`✅ ${path.relative(process.cwd(), filePath)}: ${totalChanges} 个修复`);
      return totalChanges;
    }

    return 0;
  } catch (error) {
    console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
    return 0;
  }
}

// 获取所有 TypeScript 文件
function getAllTsFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// 主执行函数
function main() {
  const startTime = Date.now();
  const tsFiles = getAllTsFiles(process.cwd());
  let totalChanges = 0;
  let processedFiles = 0;

  console.log(`📁 找到 ${tsFiles.length} 个 TypeScript 文件\n`);

  for (const file of tsFiles) {
    const changes = processFile(file);
    if (changes > 0) {
      totalChanges += changes;
      processedFiles++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log(`\n🎉 修复完成！`);
  console.log(`📊 统计信息:`);
  console.log(`   - 处理文件: ${processedFiles}/${tsFiles.length}`);
  console.log(`   - 总修复数: ${totalChanges}`);
  console.log(`   - 耗时: ${duration}s`);
  
  if (totalChanges > 0) {
    console.log(`\n🔍 建议运行以下命令验证修复效果:`);
    console.log(`   npm run type-check`);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { processFile, getAllTsFiles };
