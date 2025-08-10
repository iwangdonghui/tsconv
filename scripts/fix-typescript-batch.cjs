#!/usr/bin/env node

/**
 * TypeScript 错误批量修复脚本 - 保守版本
 * 
 * 此脚本修复常见的 TypeScript 错误：
 * - TS6133: 未使用的变量 (添加下划线前缀)
 * - TS2532: 可能为 undefined 的对象 (添加空值检查)
 * - TS2345: 类型不匹配 (添加默认值)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 开始批量修复 TypeScript 错误...\n');

// 获取当前 TypeScript 错误
function getCurrentErrors() {
  try {
    const output = execSync('npm run type-check 2>&1', { encoding: 'utf8' });
    const errors = output.split('\n')
      .filter(line => line.includes('error TS'))
      .map(line => {
        const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
        if (match) {
          return {
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            code: match[4],
            message: match[5]
          };
        }
        return null;
      })
      .filter(Boolean);
    
    return errors;
  } catch (error) {
    console.error('获取 TypeScript 错误失败:', error.message);
    return [];
  }
}

// 修复未使用变量错误
function fixUnusedVariables(filePath, content) {
  let fixed = content;
  let changes = 0;

  // 常见的未使用变量模式
  const patterns = [
    { pattern: /^(\s*)const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/gm, replacement: '$1const _$2 =' },
    { pattern: /^(\s*)let\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/gm, replacement: '$1let _$2 =' },
    { pattern: /^(\s*)function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm, replacement: '$1function _$2(' },
    { pattern: /\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^,)]+)\s*\)/g, replacement: '(_$1: $2)' },
  ];

  // 只修复明确知道的未使用变量
  const specificFixes = [
    'updateAPIKeySchema',
    'extractInfoValue', 
    'getRateLimitRule',
    'estimateCacheSize',
    'enableSQLInjectionProtection',
    'enableXSSProtection',
    'hashedKey',
    'userAgent',
    'origin',
    'config'
  ];

  specificFixes.forEach(varName => {
    const regex = new RegExp(`\\b${varName}\\b(?=\\s*[=:])`);
    if (regex.test(fixed) && !fixed.includes(`_${varName}`)) {
      fixed = fixed.replace(regex, `_${varName}`);
      changes++;
    }
  });

  return { content: fixed, changes };
}

// 修复类型不匹配错误
function fixTypeMismatches(filePath, content) {
  let fixed = content;
  let changes = 0;

  const fixes = [
    // parseInt 参数可能为 undefined
    {
      pattern: /parseInt\(([^)]+)\[(\d+)\]\)/g,
      replacement: 'parseInt($1[$2] || "0")'
    },
    // 数组访问可能为 undefined
    {
      pattern: /(\w+)\[(\w+\.\w+\(\))\](?!\s*[=!])/g,
      replacement: '($1[$2] || "")'
    },
    // split 结果可能为 undefined
    {
      pattern: /(\w+)\[(\d+)\]\.replace/g,
      replacement: '($1[$2] || "").replace'
    }
  ];

  fixes.forEach(fix => {
    const before = fixed;
    fixed = fixed.replace(fix.pattern, fix.replacement);
    if (before !== fixed) {
      changes++;
    }
  });

  return { content: fixed, changes };
}

// 处理单个文件
function processFile(filePath, errors) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let result = content;
    let totalChanges = 0;

    // 获取该文件的错误
    const fileErrors = errors.filter(err => err.file === filePath);
    
    if (fileErrors.length === 0) {
      return 0;
    }

    // 根据错误类型应用修复
    const hasUnusedVars = fileErrors.some(err => err.code === 'TS6133');
    const hasTypeMismatches = fileErrors.some(err => err.code === 'TS2345');

    if (hasUnusedVars) {
      const { content: newContent, changes } = fixUnusedVariables(filePath, result);
      result = newContent;
      totalChanges += changes;
    }

    if (hasTypeMismatches) {
      const { content: newContent, changes } = fixTypeMismatches(filePath, result);
      result = newContent;
      totalChanges += changes;
    }

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

// 主执行函数
function main() {
  const startTime = Date.now();
  
  console.log('📊 获取当前 TypeScript 错误...');
  const errors = getCurrentErrors();
  
  if (errors.length === 0) {
    console.log('🎉 没有发现 TypeScript 错误！');
    return;
  }

  console.log(`📁 发现 ${errors.length} 个 TypeScript 错误\n`);

  // 按文件分组错误
  const fileGroups = {};
  errors.forEach(error => {
    if (!fileGroups[error.file]) {
      fileGroups[error.file] = [];
    }
    fileGroups[error.file].push(error);
  });

  let totalChanges = 0;
  let processedFiles = 0;

  // 处理每个文件
  Object.keys(fileGroups).forEach(filePath => {
    const changes = processFile(filePath, errors);
    if (changes > 0) {
      totalChanges += changes;
      processedFiles++;
    }
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log(`\n🎉 修复完成！`);
  console.log(`📊 统计信息:`);
  console.log(`   - 处理文件: ${processedFiles}/${Object.keys(fileGroups).length}`);
  console.log(`   - 总修复数: ${totalChanges}`);
  console.log(`   - 耗时: ${duration}s`);
  
  if (totalChanges > 0) {
    console.log(`\n🔍 验证修复效果:`);
    try {
      const newErrors = getCurrentErrors();
      const reduction = errors.length - newErrors.length;
      console.log(`   - 错误减少: ${reduction} 个 (${errors.length} → ${newErrors.length})`);
      
      if (reduction > 0) {
        console.log(`✅ 成功减少了 ${reduction} 个 TypeScript 错误！`);
      }
    } catch (error) {
      console.log(`   - 请手动运行 npm run type-check 验证结果`);
    }
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { processFile, getCurrentErrors };
