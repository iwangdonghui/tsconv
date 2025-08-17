#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// 批量修复未使用的参数
function fixUnusedParams(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 修复函数参数中的未使用变量
  const patterns = [
    // 函数参数
    {
      regex: /\b(request|env|date|timezone|locale|outputFormats|oneMinuteAgo|ttl)(?=\s*[,)])/g,
      replacement: '_$1',
    },
    // 接口定义
    { regex: /interface\s+(\w+Response)\s*{/, replacement: 'interface _$1 {' },
  ];

  patterns.forEach(({ regex, replacement }) => {
    const newContent = content.replace(regex, replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }
}

// 获取所有 TypeScript 文件
function getAllTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

// 主函数
function main() {
  const tsFiles = getAllTsFiles('./api-handlers');

  console.log(`Found ${tsFiles.length} TypeScript files`);

  tsFiles.forEach(fixUnusedParams);

  console.log('Batch fix completed!');
}

main();
