#!/usr/bin/env node

/**
 * TypeScript Optimization Script
 * Gradually enables strict TypeScript settings and fixes compilation errors
 */

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔧 TypeScript Configuration Optimization\n');

// Backup current tsconfig.json
const tsconfigPath = 'tsconfig.json';
const backupPath = 'tsconfig.json.backup';

if (!fs.existsSync(tsconfigPath)) {
  console.error('❌ tsconfig.json not found');
  process.exit(1);
}

// Create backup
fs.copyFileSync(tsconfigPath, backupPath);
console.log(`✅ Created backup: ${backupPath}`);

// Read current configuration
const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

// Define optimization steps in order of priority
const optimizationSteps = [
  {
    name: 'noImplicitAny',
    value: true,
    description: 'Require explicit types for variables',
    impact: 'High'
  },
  {
    name: 'noFallthroughCasesInSwitch',
    value: true,
    description: 'Prevent fallthrough in switch statements',
    impact: 'Low'
  },
  {
    name: 'noUnusedLocals',
    value: true,
    description: 'Prevent unused local variables',
    impact: 'Medium'
  },
  {
    name: 'noUnusedParameters',
    value: true,
    description: 'Prevent unused function parameters',
    impact: 'Medium'
  }
];

async function testCompilation() {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    return { success: true, errors: [] };
  } catch (error) {
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    const errors = output.split('\n').filter(line => line.includes('error TS'));
    return { success: false, errors };
  }
}

async function optimizeStep(step) {
  console.log(`\n🔄 Enabling ${step.name} (${step.impact} impact)`);
  console.log(`   Description: ${step.description}`);
  
  // Update configuration
  tsconfig.compilerOptions[step.name] = step.value;
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  
  // Test compilation
  console.log('   Testing compilation...');
  const result = await testCompilation();
  
  if (result.success) {
    console.log(`   ✅ ${step.name} enabled successfully`);
    return true;
  } else {
    console.log(`   ❌ ${step.name} caused ${result.errors.length} compilation errors`);
    
    // Show first few errors
    const maxErrors = 5;
    const errorsToShow = result.errors.slice(0, maxErrors);
    errorsToShow.forEach(error => {
      console.log(`      ${error}`);
    });
    
    if (result.errors.length > maxErrors) {
      console.log(`      ... and ${result.errors.length - maxErrors} more errors`);
    }
    
    // Revert the change
    console.log(`   🔄 Reverting ${step.name} due to compilation errors`);
    tsconfig.compilerOptions[step.name] = false;
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    
    return false;
  }
}

async function enableStrictMode() {
  console.log('\n🎯 Attempting to enable strict mode...');
  
  // First, try enabling strict mode directly
  tsconfig.compilerOptions.strict = true;
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  
  const result = await testCompilation();
  
  if (result.success) {
    console.log('✅ Strict mode enabled successfully!');
    return true;
  } else {
    console.log(`❌ Strict mode caused ${result.errors.length} compilation errors`);
    
    // Revert strict mode
    tsconfig.compilerOptions.strict = false;
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    
    console.log('🔄 Will enable individual strict options instead');
    return false;
  }
}

async function main() {
  console.log('📊 Starting TypeScript optimization process...');
  
  // Test initial compilation
  console.log('\n🧪 Testing initial compilation...');
  const initialResult = await testCompilation();
  
  if (!initialResult.success) {
    console.log('❌ Initial compilation failed. Please fix existing errors first.');
    console.log('Errors:');
    initialResult.errors.slice(0, 10).forEach(error => {
      console.log(`  ${error}`);
    });
    process.exit(1);
  }
  
  console.log('✅ Initial compilation successful');
  
  // Try to enable strict mode first
  const strictEnabled = await enableStrictMode();
  
  if (!strictEnabled) {
    // Enable individual options
    console.log('\n📋 Enabling individual TypeScript options...');
    
    let successCount = 0;
    let totalSteps = optimizationSteps.length;
    
    for (const step of optimizationSteps) {
      const success = await optimizeStep(step);
      if (success) {
        successCount++;
      }
    }
    
    console.log(`\n📊 Optimization Results: ${successCount}/${totalSteps} options enabled`);
  }
  
  // Final compilation test
  console.log('\n🧪 Final compilation test...');
  const finalResult = await testCompilation();
  
  if (finalResult.success) {
    console.log('✅ Final compilation successful');
  } else {
    console.log('❌ Final compilation failed');
    console.log('This should not happen. Please check the configuration.');
  }
  
  // Show final configuration
  console.log('\n📋 Final TypeScript Configuration');
  console.log('=' .repeat(50));
  
  const finalConfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  const compilerOptions = finalConfig.compilerOptions;
  
  const strictOptions = [
    'strict',
    'noImplicitAny',
    'strictNullChecks',
    'strictFunctionTypes',
    'noUnusedLocals',
    'noUnusedParameters',
    'noFallthroughCasesInSwitch'
  ];
  
  strictOptions.forEach(option => {
    const value = compilerOptions[option];
    const status = value === true ? '✅' : value === false ? '❌' : '⚪';
    const displayValue = value === undefined ? 'default' : value.toString();
    console.log(`${status} ${option}: ${displayValue}`);
  });
  
  // Calculate improvement score
  const enabledCount = strictOptions.filter(option => compilerOptions[option] === true).length;
  const improvementScore = Math.round((enabledCount / strictOptions.length) * 100);
  
  console.log(`\n📈 TypeScript Strictness Score: ${improvementScore}%`);
  
  if (improvementScore >= 80) {
    console.log('🎉 Excellent! TypeScript configuration is well optimized.');
  } else if (improvementScore >= 60) {
    console.log('👍 Good progress! Consider enabling more strict options.');
  } else {
    console.log('⚠️  More work needed to improve TypeScript strictness.');
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Review and fix any remaining type issues');
  console.log('2. Test application functionality thoroughly');
  console.log('3. Consider enabling remaining strict options manually');
  console.log('4. Run: npm run test to ensure everything works');
  
  console.log(`\n💾 Backup saved as: ${backupPath}`);
  console.log('   Use this to restore if needed: cp tsconfig.json.backup tsconfig.json');
  
  console.log('\n' + '=' .repeat(50));
  console.log('🔧 TypeScript Optimization Complete!');
}

// Run the optimization
main().catch(error => {
  console.error('❌ Optimization failed:', error);
  
  // Restore backup
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, tsconfigPath);
    console.log('🔄 Configuration restored from backup');
  }
  
  process.exit(1);
});