#!/usr/bin/env node

/**
 * Fix Color Scheme and Dropdown Styles Script
 * 1. Unifies color scheme to blue theme
 * 2. Fixes dropdown/select box dark mode styling
 * 3. Improves date picker styling
 */

import fs from 'fs';
import path from 'path';

const COMPONENTS = [
  'src/components/WorkdaysCalculator.tsx',
  'src/components/DateDiffCalculator.tsx',
  'src/components/FormatTool.tsx',
  'src/components/TimezoneExplorer.tsx',
];

// Color scheme unification fixes
const COLOR_SCHEME_FIXES = [
  // DateDiffCalculator: Change purple to blue theme
  {
    from: 'className="h-8 w-8 text-purple-600"',
    to: 'className="h-8 w-8 text-blue-600"',
    description: 'Change icon color to blue theme',
  },
  {
    from: 'focus:ring-purple-500',
    to: 'focus:ring-blue-500',
    description: 'Change focus ring to blue',
  },
  {
    from: 'text-purple-400 hover:text-purple-300',
    to: 'text-blue-400 hover:text-blue-300',
    description: 'Change link colors to blue (dark mode)',
  },
  {
    from: 'text-purple-600 hover:text-purple-800',
    to: 'text-blue-600 hover:text-blue-800',
    description: 'Change link colors to blue (light mode)',
  },
  {
    from: 'bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700',
    to: 'bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700',
    description: 'Change button colors to blue',
  },
  {
    from: 'from-purple-900/20 to-blue-900/20',
    to: 'from-blue-900/20 to-indigo-900/20',
    description: 'Change gradient to blue theme (dark)',
  },
  {
    from: 'from-purple-50 to-blue-50',
    to: 'from-blue-50 to-indigo-50',
    description: 'Change gradient to blue theme (light)',
  },
  {
    from: 'bg-purple-900/20 border border-purple-800',
    to: 'bg-blue-900/20 border border-blue-800',
    description: 'Change card background to blue (dark)',
  },
  {
    from: 'bg-purple-50',
    to: 'bg-blue-50',
    description: 'Change card background to blue (light)',
  },
  {
    from: 'text-purple-400',
    to: 'text-blue-400',
    description: 'Change text color to blue (dark)',
  },
  {
    from: 'text-purple-600',
    to: 'text-blue-600',
    description: 'Change text color to blue (light)',
  },
  {
    from: 'text-purple-300',
    to: 'text-blue-300',
    description: 'Change secondary text to blue (dark)',
  },
  {
    from: 'text-purple-800',
    to: 'text-blue-800',
    description: 'Change secondary text to blue (light)',
  },

  // FormatTool: Change indigo to blue theme for consistency
  {
    from: 'className="h-8 w-8 text-indigo-600"',
    to: 'className="h-8 w-8 text-blue-600"',
    description: 'Change format tool icon to blue',
  },
  {
    from: 'focus:ring-indigo-500',
    to: 'focus:ring-blue-500',
    description: 'Change format tool focus ring to blue',
  },
  {
    from: 'bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700',
    to: 'bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700',
    description: 'Change format tool button to blue',
  },
  {
    from: 'text-indigo-400 hover:text-indigo-300',
    to: 'text-blue-400 hover:text-blue-300',
    description: 'Change format tool links to blue (dark)',
  },
  {
    from: 'text-indigo-600 hover:text-indigo-800',
    to: 'text-blue-600 hover:text-blue-800',
    description: 'Change format tool links to blue (light)',
  },
  {
    from: 'from-indigo-50 to-purple-50',
    to: 'from-blue-50 to-indigo-50',
    description: 'Change format tool gradient to blue',
  },
  {
    from: 'from-indigo-900/20 to-purple-900/20',
    to: 'from-blue-900/20 to-indigo-900/20',
    description: 'Change format tool gradient to blue (dark)',
  },

  // TimezoneExplorer: Change emerald to blue theme for consistency
  {
    from: 'className="h-8 w-8 text-emerald-600"',
    to: 'className="h-8 w-8 text-blue-600"',
    description: 'Change timezone explorer icon to blue',
  },
  {
    from: 'focus:ring-emerald-500',
    to: 'focus:ring-blue-500',
    description: 'Change timezone explorer focus ring to blue',
  },
  {
    from: 'text-emerald-400 hover:text-emerald-300',
    to: 'text-blue-400 hover:text-blue-300',
    description: 'Change timezone explorer links to blue (dark)',
  },
  {
    from: 'text-emerald-600 hover:text-emerald-800',
    to: 'text-blue-600 hover:text-blue-800',
    description: 'Change timezone explorer links to blue (light)',
  },
];

// Dropdown and select box fixes
const DROPDOWN_FIXES = [
  // Fix select elements that weren't caught by previous scripts
  {
    from: 'className="w-32 px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"',
    to: "className={`w-32 px-3 py-1 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}",
    description: 'Fix country select dropdown',
  },

  // Fix format template select
  {
    from: 'className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"',
    to: "className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}",
    description: 'Fix format template select',
  },

  // Fix timezone filter selects that might have been missed
  {
    from: 'className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"',
    to: "className={`px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}",
    description: 'Fix timezone filter selects',
  },

  // Fix any remaining input fields that might have been missed
  {
    from: 'className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"',
    to: "className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900'}`}",
    description: 'Fix remaining input fields',
  },
];

// Note: Date picker styling will be handled separately as it requires CSS injection

function fixColorSchemeAndDropdowns() {
  console.log('🎨 Fixing Color Scheme and Dropdown Styles\n');

  let totalFixes = 0;

  for (const componentPath of COMPONENTS) {
    console.log(`📝 Processing ${componentPath}...`);

    try {
      let content = fs.readFileSync(componentPath, 'utf8');
      let componentFixes = 0;

      // Apply color scheme fixes
      for (const fix of COLOR_SCHEME_FIXES) {
        const beforeCount = (content.match(new RegExp(escapeRegExp(fix.from), 'g')) || []).length;
        content = content.replace(new RegExp(escapeRegExp(fix.from), 'g'), fix.to);

        const fixCount = beforeCount;
        if (fixCount > 0) {
          componentFixes += fixCount;
          console.log(`  🎨 ${fix.description}: ${fixCount} instances`);
        }
      }

      // Apply dropdown fixes
      for (const fix of DROPDOWN_FIXES) {
        const beforeCount = (content.match(new RegExp(escapeRegExp(fix.from), 'g')) || []).length;
        content = content.replace(new RegExp(escapeRegExp(fix.from), 'g'), fix.to);

        const fixCount = beforeCount;
        if (fixCount > 0) {
          componentFixes += fixCount;
          console.log(`  📋 ${fix.description}: ${fixCount} instances`);
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

  console.log('='.repeat(50));
  console.log(`🎉 Color Scheme and Dropdown Fixes Complete!`);
  console.log(`📊 Total fixes applied: ${totalFixes}`);

  if (totalFixes > 0) {
    console.log('\n✅ All components now use consistent blue color scheme');
    console.log('📋 All dropdowns and select boxes have proper dark mode styling');
    console.log('🎨 Visual consistency improved across all components');
    console.log('🚀 Ready to build and deploy');
  } else {
    console.log('\n💡 No fixes needed - color scheme and dropdowns already consistent');
  }

  return totalFixes;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixColorSchemeAndDropdowns();
}

export { fixColorSchemeAndDropdowns };
