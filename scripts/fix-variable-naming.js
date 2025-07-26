#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Files to fix
const filesToFix = [
  'api/handlers/unified-health.ts'
];

function fixVariableNaming(filePath) {
  console.log(`\n🔧 Fixing variable naming in ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Common variable naming fixes
  const fixes = [
    // Fix specific Redis and process method calls
    { pattern: /await redis\./g, replacement: 'await _redis.' },
    { pattern: /redis\.ping/g, replacement: '_redis.ping' },
    { pattern: /redis\.set/g, replacement: '_redis.set' },
    { pattern: /redis\.get/g, replacement: '_redis.get' },
    { pattern: /redis\.del/g, replacement: '_redis.del' },
    { pattern: /redis\.setex/g, replacement: '_redis.setex' },
    { pattern: /redis\.exists/g, replacement: '_redis.exists' },
    { pattern: /redis\.dbsize/g, replacement: '_redis.dbsize' },
    { pattern: /process\._uptime/g, replacement: 'process.uptime' },
    { pattern: /process\._memoryUsage/g, replacement: 'process.memoryUsage' },

    // Fix property names with underscores that should not have them
    { pattern: /_lastCheck:/g, replacement: 'lastCheck:' },
    { pattern: /_totalRequests:/g, replacement: 'totalRequests:' },
    { pattern: /_rateLimitedRequests:/g, replacement: 'rateLimitedRequests:' },
    { pattern: /_blockedPercentage:/g, replacement: 'blockedPercentage:' },

    // Fix variable references that should use underscores
    { pattern: /\bresult\.formats/g, replacement: '_result.formats' },
    { pattern: /!result\./g, replacement: '!_result.' },
    { pattern: /\bresult &&/g, replacement: '_result &&' },

    // Fix process method calls
    { pattern: /_uptime: process\._uptime\(\)/g, replacement: 'uptime: process.uptime()' },
  ];

  // Apply fixes
  for (const fix of fixes) {
    const before = content;
    content = content.replace(fix.pattern, fix.replacement);
    if (content !== before) {
      modified = true;
      console.log(`  ✅ Applied fix: ${fix.pattern} -> ${fix.replacement}`);
    }
  }

  // Save the file if modified
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  💾 Saved changes to ${filePath}`);
    return true;
  } else {
    console.log(`  ⚪ No changes needed for ${filePath}`);
    return false;
  }
}

// Main execution
console.log('🚀 Starting variable naming fixes...\n');

let totalFixed = 0;
for (const file of filesToFix) {
  if (fixVariableNaming(file)) {
    totalFixed++;
  }
}

console.log(`\n📊 Summary: Fixed ${totalFixed}/${filesToFix.length} files`);

if (totalFixed > 0) {
  console.log('\n🧪 Running TypeScript compilation check...');

  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('✅ TypeScript compilation successful!');
  } catch (error) {
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    const errorCount = (output.match(/error TS/g) || []).length;
    console.log(`⚠️  TypeScript compilation failed with ${errorCount} errors`);

    // Show first few errors for context
    const lines = output.split('\n').filter(line => line.includes('error TS')).slice(0, 5);
    if (lines.length > 0) {
      console.log('\nFirst few errors:');
      lines.forEach(line => console.log(`  ${line}`));
    }
  }
}
