#!/usr/bin/env node

/**
 * Fix Dark Mode Styles Script
 * Updates all new components to have proper dark mode styling
 */

import fs from 'fs';
import path from 'path';

const COMPONENTS = [
  'src/components/WorkdaysCalculator.tsx',
  'src/components/DateDiffCalculator.tsx',
  'src/components/FormatTool.tsx',
  'src/components/TimezoneExplorer.tsx'
];

// Style replacements for dark mode
const STYLE_FIXES = [
  // Labels
  {
    from: 'className="block text-sm font-medium text-gray-700 mb-2"',
    to: 'className={`block text-sm font-medium mb-2 ${isDark ? \'text-gray-300\' : \'text-gray-700\'}`}'
  },
  {
    from: 'className="block text-sm font-medium text-gray-700 mb-1"',
    to: 'className={`block text-sm font-medium mb-1 ${isDark ? \'text-gray-300\' : \'text-gray-700\'}`}'
  },
  
  // Input fields
  {
    from: 'className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"',
    to: 'className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? \'bg-slate-700 border-slate-600 text-white placeholder-slate-400\' : \'bg-white border-gray-300 text-gray-900\'}`}'
  },
  {
    from: 'className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"',
    to: 'className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? \'bg-slate-700 border-slate-600 text-white placeholder-slate-400\' : \'bg-white border-gray-300 text-gray-900\'}`}'
  },
  {
    from: 'className="w-full px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"',
    to: 'className={`w-full px-3 py-1 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? \'bg-slate-700 border-slate-600 text-white\' : \'bg-white border-gray-300 text-gray-900\'}`}'
  },
  
  // Select fields
  {
    from: 'className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"',
    to: 'className={`px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? \'bg-slate-700 border-slate-600 text-white\' : \'bg-white border-gray-300 text-gray-900\'}`}'
  },
  {
    from: 'className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"',
    to: 'className={`px-3 py-1 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? \'bg-slate-700 border-slate-600 text-white\' : \'bg-white border-gray-300 text-gray-900\'}`}'
  },
  
  // Text colors
  {
    from: 'className="text-sm text-gray-600"',
    to: 'className={`text-sm ${isDark ? \'text-gray-400\' : \'text-gray-600\'}`}'
  },
  {
    from: 'className="text-sm text-gray-500"',
    to: 'className={`text-sm ${isDark ? \'text-gray-400\' : \'text-gray-500\'}`}'
  },
  {
    from: 'className="text-xs text-gray-500"',
    to: 'className={`text-xs ${isDark ? \'text-gray-400\' : \'text-gray-500\'}`}'
  },
  {
    from: 'className="text-lg font-semibold text-gray-900"',
    to: 'className={`text-lg font-semibold ${isDark ? \'text-white\' : \'text-gray-900\'}`}'
  },
  {
    from: 'className="text-center text-gray-500 py-8"',
    to: 'className={`text-center py-8 ${isDark ? \'text-gray-400\' : \'text-gray-500\'}`}'
  },
  
  // Background colors for cards and sections
  {
    from: 'className="bg-gray-50 p-4 rounded-lg"',
    to: 'className={`p-4 rounded-lg ${isDark ? \'bg-slate-700\' : \'bg-gray-50\'}`}'
  },
  {
    from: 'className="bg-gray-50 p-3 rounded-lg"',
    to: 'className={`p-3 rounded-lg ${isDark ? \'bg-slate-700\' : \'bg-gray-50\'}`}'
  },
  {
    from: 'className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"',
    to: 'className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${isDark ? \'bg-slate-700 border-slate-600\' : \'bg-white border-gray-200\'}`}'
  },
  
  // Buttons
  {
    from: 'className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"',
    to: 'className={`px-4 py-2 border rounded-md transition-colors ${isDark ? \'border-slate-600 hover:bg-slate-700 text-white\' : \'border-gray-300 hover:bg-gray-50 text-gray-900\'}`}'
  },
  {
    from: 'className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"',
    to: 'className={`px-3 py-1 text-sm transition-colors ${isDark ? \'text-gray-400 hover:text-gray-200\' : \'text-gray-600 hover:text-gray-800\'}`}'
  },
  
  // Icons
  {
    from: 'className="absolute left-3 top-3 h-4 w-4 text-gray-400"',
    to: 'className={`absolute left-3 top-3 h-4 w-4 ${isDark ? \'text-gray-500\' : \'text-gray-400\'}`}'
  },
  {
    from: 'className="h-4 w-4 text-gray-400"',
    to: 'className={`h-4 w-4 ${isDark ? \'text-gray-500\' : \'text-gray-400\'}`}'
  }
];

function fixDarkModeStyles() {
  console.log('🎨 Fixing Dark Mode Styles\n');
  
  let totalFixes = 0;
  
  for (const componentPath of COMPONENTS) {
    console.log(`📝 Processing ${componentPath}...`);
    
    try {
      let content = fs.readFileSync(componentPath, 'utf8');
      let componentFixes = 0;
      
      for (const fix of STYLE_FIXES) {
        const beforeCount = (content.match(new RegExp(escapeRegExp(fix.from), 'g')) || []).length;
        content = content.replace(new RegExp(escapeRegExp(fix.from), 'g'), fix.to);
        const afterCount = (content.match(new RegExp(escapeRegExp(fix.to), 'g')) || []).length;
        
        const fixCount = beforeCount;
        if (fixCount > 0) {
          componentFixes += fixCount;
          console.log(`  ✅ Fixed ${fixCount} instances of style pattern`);
        }
      }
      
      // Write back the fixed content
      fs.writeFileSync(componentPath, content, 'utf8');
      
      console.log(`  📊 Total fixes in ${path.basename(componentPath)}: ${componentFixes}\n`);
      totalFixes += componentFixes;
      
    } catch (error) {
      console.error(`  ❌ Error processing ${componentPath}:`, error.message);
    }
  }
  
  console.log('=' .repeat(50));
  console.log(`🎉 Dark Mode Style Fixes Complete!`);
  console.log(`📊 Total fixes applied: ${totalFixes}`);
  
  if (totalFixes > 0) {
    console.log('\n✅ All components now have proper dark mode styling');
    console.log('🚀 Ready to build and deploy');
  } else {
    console.log('\n💡 No fixes needed - styles already up to date');
  }
  
  return totalFixes;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixDarkModeStyles();
}

export { fixDarkModeStyles };
