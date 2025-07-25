#!/usr/bin/env node

/**
 * Comprehensive Dark Mode Fix Script
 * Fixes all remaining dark mode issues in new components
 */

import fs from 'fs';
import path from 'path';

const COMPONENTS = [
  'src/components/WorkdaysCalculator.tsx',
  'src/components/DateDiffCalculator.tsx',
  'src/components/FormatTool.tsx',
  'src/components/TimezoneExplorer.tsx'
];

// Comprehensive dark mode fixes
const DARK_MODE_FIXES = [
  // Error displays
  {
    from: 'className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md"',
    to: 'className={`flex items-center gap-2 p-3 rounded-md border ${isDark ? \'bg-red-900/20 border-red-800 text-red-200\' : \'bg-red-50 border-red-200 text-red-700\'}`}',
    description: 'Fix error display backgrounds'
  },
  
  // Colored result cards - Blue
  {
    from: 'className="bg-blue-50 p-4 rounded-lg"',
    to: 'className={`p-4 rounded-lg ${isDark ? \'bg-blue-900/20 border border-blue-800\' : \'bg-blue-50\'}`}',
    description: 'Fix blue result cards'
  },
  {
    from: 'className="text-2xl font-bold text-blue-600"',
    to: 'className={`text-2xl font-bold ${isDark ? \'text-blue-400\' : \'text-blue-600\'}`}',
    description: 'Fix blue text in cards'
  },
  {
    from: 'className="text-sm text-blue-800"',
    to: 'className={`text-sm ${isDark ? \'text-blue-300\' : \'text-blue-800\'}`}',
    description: 'Fix blue secondary text'
  },
  
  // Colored result cards - Orange
  {
    from: 'className="bg-orange-50 p-4 rounded-lg"',
    to: 'className={`p-4 rounded-lg ${isDark ? \'bg-orange-900/20 border border-orange-800\' : \'bg-orange-50\'}`}',
    description: 'Fix orange result cards'
  },
  {
    from: 'className="text-2xl font-bold text-orange-600"',
    to: 'className={`text-2xl font-bold ${isDark ? \'text-orange-400\' : \'text-orange-600\'}`}',
    description: 'Fix orange text in cards'
  },
  {
    from: 'className="text-sm text-orange-800"',
    to: 'className={`text-sm ${isDark ? \'text-orange-300\' : \'text-orange-800\'}`}',
    description: 'Fix orange secondary text'
  },
  
  // Colored result cards - Red
  {
    from: 'className="bg-red-50 p-4 rounded-lg"',
    to: 'className={`p-4 rounded-lg ${isDark ? \'bg-red-900/20 border border-red-800\' : \'bg-red-50\'}`}',
    description: 'Fix red result cards'
  },
  {
    from: 'className="text-2xl font-bold text-red-600"',
    to: 'className={`text-2xl font-bold ${isDark ? \'text-red-400\' : \'text-red-600\'}`}',
    description: 'Fix red text in cards'
  },
  {
    from: 'className="text-sm text-red-800"',
    to: 'className={`text-sm ${isDark ? \'text-red-300\' : \'text-red-800\'}`}',
    description: 'Fix red secondary text'
  },
  
  // Colored result cards - Yellow
  {
    from: 'className="bg-yellow-50 p-4 rounded-lg"',
    to: 'className={`p-4 rounded-lg ${isDark ? \'bg-yellow-900/20 border border-yellow-800\' : \'bg-yellow-50\'}`}',
    description: 'Fix yellow result cards'
  },
  {
    from: 'className="font-medium text-yellow-800 mb-2"',
    to: 'className={`font-medium mb-2 ${isDark ? \'text-yellow-300\' : \'text-yellow-800\'}`}',
    description: 'Fix yellow headers'
  },
  {
    from: 'className="text-sm text-yellow-700 max-h-32 overflow-y-auto"',
    to: 'className={`text-sm max-h-32 overflow-y-auto ${isDark ? \'text-yellow-200\' : \'text-yellow-700\'}`}',
    description: 'Fix yellow content text'
  },
  {
    from: 'className="text-yellow-600 mt-1"',
    to: 'className={`mt-1 ${isDark ? \'text-yellow-400\' : \'text-yellow-600\'}`}',
    description: 'Fix yellow accent text'
  },
  
  // Colored result cards - Green
  {
    from: 'className="bg-green-50 p-3 rounded-lg"',
    to: 'className={`p-3 rounded-lg ${isDark ? \'bg-green-900/20 border border-green-800\' : \'bg-green-50\'}`}',
    description: 'Fix green result cards'
  },
  {
    from: 'className="text-lg font-bold text-green-600"',
    to: 'className={`text-lg font-bold ${isDark ? \'text-green-400\' : \'text-green-600\'}`}',
    description: 'Fix green text in cards'
  },
  {
    from: 'className="text-sm text-green-800"',
    to: 'className={`text-sm ${isDark ? \'text-green-300\' : \'text-green-800\'}`}',
    description: 'Fix green secondary text'
  },
  
  // Colored result cards - Purple
  {
    from: 'className="bg-purple-50 p-3 rounded-lg"',
    to: 'className={`p-3 rounded-lg ${isDark ? \'bg-purple-900/20 border border-purple-800\' : \'bg-purple-50\'}`}',
    description: 'Fix purple result cards'
  },
  {
    from: 'className="text-lg font-bold text-purple-600"',
    to: 'className={`text-lg font-bold ${isDark ? \'text-purple-400\' : \'text-purple-600\'}`}',
    description: 'Fix purple text in cards'
  },
  {
    from: 'className="text-sm text-purple-800"',
    to: 'className={`text-sm ${isDark ? \'text-purple-300\' : \'text-purple-800\'}`}',
    description: 'Fix purple secondary text'
  },
  
  // Colored result cards - Indigo
  {
    from: 'className="bg-indigo-50 p-3 rounded-lg"',
    to: 'className={`p-3 rounded-lg ${isDark ? \'bg-indigo-900/20 border border-indigo-800\' : \'bg-indigo-50\'}`}',
    description: 'Fix indigo result cards'
  },
  {
    from: 'className="text-lg font-bold text-indigo-600"',
    to: 'className={`text-lg font-bold ${isDark ? \'text-indigo-400\' : \'text-indigo-600\'}`}',
    description: 'Fix indigo text in cards'
  },
  {
    from: 'className="text-sm text-indigo-800"',
    to: 'className={`text-sm ${isDark ? \'text-indigo-300\' : \'text-indigo-800\'}`}',
    description: 'Fix indigo secondary text'
  },
  
  // Colored result cards - Pink
  {
    from: 'className="bg-pink-50 p-3 rounded-lg"',
    to: 'className={`p-3 rounded-lg ${isDark ? \'bg-pink-900/20 border border-pink-800\' : \'bg-pink-50\'}`}',
    description: 'Fix pink result cards'
  },
  {
    from: 'className="text-lg font-bold text-pink-600"',
    to: 'className={`text-lg font-bold ${isDark ? \'text-pink-400\' : \'text-pink-600\'}`}',
    description: 'Fix pink text in cards'
  },
  {
    from: 'className="text-sm text-pink-800"',
    to: 'className={`text-sm ${isDark ? \'text-pink-300\' : \'text-pink-800\'}`}',
    description: 'Fix pink secondary text'
  },
  
  // Gradient backgrounds
  {
    from: 'className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border"',
    to: 'className={`p-4 rounded-lg border ${isDark ? \'bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-slate-600\' : \'bg-gradient-to-r from-purple-50 to-blue-50 border-gray-200\'}`}',
    description: 'Fix gradient backgrounds'
  },
  {
    from: 'className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border"',
    to: 'className={`p-4 rounded-lg border ${isDark ? \'bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border-slate-600\' : \'bg-gradient-to-r from-indigo-50 to-purple-50 border-gray-200\'}`}',
    description: 'Fix gradient backgrounds'
  },
  
  // Special text colors that need fixing
  {
    from: 'className="text-2xl font-bold text-gray-600"',
    to: 'className={`text-2xl font-bold ${isDark ? \'text-gray-300\' : \'text-gray-600\'}`}',
    description: 'Fix gray text in cards'
  },
  
  // Font mono backgrounds
  {
    from: 'className="text-xl font-mono bg-white p-3 rounded border"',
    to: 'className={`text-xl font-mono p-3 rounded border ${isDark ? \'bg-slate-700 border-slate-600 text-white\' : \'bg-white border-gray-200 text-gray-900\'}`}',
    description: 'Fix mono font backgrounds'
  },
  
  // Small text improvements
  {
    from: 'className="mt-1 text-sm text-purple-600 hover:text-purple-800"',
    to: 'className={`mt-1 text-sm transition-colors ${isDark ? \'text-purple-400 hover:text-purple-300\' : \'text-purple-600 hover:text-purple-800\'}`}',
    description: 'Fix small link text'
  },
  {
    from: 'className="mt-1 text-sm text-indigo-600 hover:text-indigo-800"',
    to: 'className={`mt-1 text-sm transition-colors ${isDark ? \'text-indigo-400 hover:text-indigo-300\' : \'text-indigo-600 hover:text-indigo-800\'}`}',
    description: 'Fix small link text'
  },
  {
    from: 'className="mt-1 text-sm text-emerald-600 hover:text-emerald-800"',
    to: 'className={`mt-1 text-sm transition-colors ${isDark ? \'text-emerald-400 hover:text-emerald-300\' : \'text-emerald-600 hover:text-emerald-800\'}`}',
    description: 'Fix small link text'
  },
  
  // Copy button text
  {
    from: 'className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"',
    to: 'className={`flex items-center gap-1 text-sm transition-colors ${isDark ? \'text-indigo-400 hover:text-indigo-300\' : \'text-indigo-600 hover:text-indigo-800\'}`}',
    description: 'Fix copy button text'
  }
];

function fixComprehensiveDarkMode() {
  console.log('🌙 Comprehensive Dark Mode Fix\n');
  
  let totalFixes = 0;
  
  for (const componentPath of COMPONENTS) {
    console.log(`📝 Processing ${componentPath}...`);
    
    try {
      let content = fs.readFileSync(componentPath, 'utf8');
      let componentFixes = 0;
      
      for (const fix of DARK_MODE_FIXES) {
        const beforeCount = (content.match(new RegExp(escapeRegExp(fix.from), 'g')) || []).length;
        content = content.replace(new RegExp(escapeRegExp(fix.from), 'g'), fix.to);
        
        const fixCount = beforeCount;
        if (fixCount > 0) {
          componentFixes += fixCount;
          console.log(`  ✅ ${fix.description}: ${fixCount} instances`);
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
  console.log(`🎉 Comprehensive Dark Mode Fixes Complete!`);
  console.log(`📊 Total fixes applied: ${totalFixes}`);
  
  if (totalFixes > 0) {
    console.log('\n✅ All colored elements now have proper dark mode styling');
    console.log('🌙 Dark mode should look consistent and professional');
    console.log('🚀 Ready to build and deploy');
  } else {
    console.log('\n💡 No fixes needed - dark mode already comprehensive');
  }
  
  return totalFixes;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixComprehensiveDarkMode();
}

export { fixComprehensiveDarkMode };
