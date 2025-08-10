#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Dark Theme Testing Script
 * Validates that all components properly support dark theme
 */

import fs from 'fs';

const COMPONENTS_TO_TEST = [
  'src/components/TimestampConverter.tsx',
  'src/components/ApiDocs.tsx',
  'src/components/EnhancedApiDocs.tsx',
  'src/components/ui/select.tsx',
  'src/components/ui/input.tsx',
  'src/components/ui/validation-indicator.tsx',
  'src/components/Header.tsx',
  'src/index.css',
];

// Patterns that indicate proper dark theme support
const GOOD_PATTERNS = [
  /bg-background/g,
  /text-foreground/g,
  /border-input/g,
  /bg-popover/g,
  /text-popover-foreground/g,
  /bg-card/g,
  /text-card-foreground/g,
  /text-muted-foreground/g,
  /placeholder:text-muted-foreground/g,
  /focus:ring-ring/g,
  /--background:/g,
  /--foreground:/g,
  /\.dark\s*{/g,
];

// Patterns that indicate hardcoded colors (should be avoided)
const BAD_PATTERNS = [
  /bg-slate-\d+(?!\s*dark:)/g,
  /text-slate-\d+(?!\s*dark:)/g,
  /border-slate-\d+(?!\s*dark:)/g,
  /bg-gray-\d+(?!\s*dark:)/g,
  /text-gray-\d+(?!\s*dark:)/g,
  /border-gray-\d+(?!\s*dark:)/g,
  /bg-white(?!\s*dark:)/g,
  /text-black(?!\s*dark:)/g,
];

function testFile(filePath) {
  console.log(`\n📁 Testing ${filePath}...`);

  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found`);
    return { passed: false, issues: ['File not found'] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  let goodPatternCount = 0;

  // Check for good patterns
  GOOD_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      goodPatternCount += matches.length;
    }
  });

  // Check for bad patterns
  BAD_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        issues.push(`Hardcoded color found: ${match}`);
      });
    }
  });

  // Special checks for specific files
  if (filePath.includes('index.css')) {
    if (!content.includes(':root {') || !content.includes('.dark {')) {
      issues.push('Missing CSS variable definitions for light/dark themes');
    }
  }

  if (filePath.includes('ThemeContext') || filePath.includes('Header')) {
    if (!content.includes('isDark') && !content.includes('toggleDarkMode')) {
      issues.push('Missing dark theme state management');
    }
  }

  const passed = issues.length === 0 && goodPatternCount > 0;

  console.log(`   ${passed ? '✅' : '❌'} ${goodPatternCount} good patterns found`);
  if (issues.length > 0) {
    console.log(`   ⚠️  ${issues.length} issues found:`);
    issues.forEach(issue => console.log(`      - ${issue}`));
  }

  return { passed, issues, goodPatternCount };
}

function runTests() {
  console.log('🌙 Testing Dark Theme Implementation\n');

  let totalPassed = 0;
  let totalTests = COMPONENTS_TO_TEST.length;
  let allIssues = [];

  COMPONENTS_TO_TEST.forEach(filePath => {
    const result = testFile(filePath);
    if (result.passed) {
      totalPassed++;
    }
    allIssues.push(...result.issues);
  });

  console.log(`\n📊 Results: ${totalPassed}/${totalTests} files passed`);

  if (allIssues.length > 0) {
    console.log(`\n⚠️  Total issues found: ${allIssues.length}`);
  }

  // Additional checks
  console.log('\n🔍 Additional Checks:');

  // Check if CSS variables are properly defined
  const cssContent = fs.readFileSync('src/index.css', 'utf8');
  const hasLightTheme = cssContent.includes(':root {') && cssContent.includes('--background:');
  const hasDarkTheme = cssContent.includes('.dark {') && cssContent.includes('--background:');

  console.log(`   ${hasLightTheme ? '✅' : '❌'} Light theme CSS variables defined`);
  console.log(`   ${hasDarkTheme ? '✅' : '❌'} Dark theme CSS variables defined`);

  // Check Tailwind config
  const tailwindConfig = fs.readFileSync('tailwind.config.js', 'utf8');
  const hasDarkModeClass = tailwindConfig.includes("darkMode: ['class']");
  console.log(`   ${hasDarkModeClass ? '✅' : '❌'} Tailwind dark mode configured`);

  const overallPassed =
    totalPassed === totalTests && hasLightTheme && hasDarkTheme && hasDarkModeClass;

  if (overallPassed) {
    console.log('\n🎉 All dark theme tests passed!');
    return true;
  } else {
    console.log('\n❌ Some dark theme tests failed. Please review the issues above.');
    return false;
  }
}

// Run the tests
const success = runTests();
process.exit(success ? 0 : 1);
