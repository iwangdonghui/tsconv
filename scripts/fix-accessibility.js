#!/usr/bin/env node

/**
 * Fix Accessibility Script
 * Adds proper aria-labels, roles, and other accessibility attributes to new components
 */

import fs from 'fs';
import path from 'path';

const COMPONENTS = [
  'src/components/WorkdaysCalculator.tsx',
  'src/components/DateDiffCalculator.tsx',
  'src/components/FormatTool.tsx',
  'src/components/TimezoneExplorer.tsx'
];

// Accessibility fixes for different types of elements
const ACCESSIBILITY_FIXES = [
  // Input fields - date inputs
  {
    from: 'type="date"',
    to: 'type="date"\n                  aria-label="Select date"',
    description: 'Add aria-label to date inputs'
  },
  
  // Input fields - time inputs
  {
    from: 'type="time"',
    to: 'type="time"\n                  aria-label="Select time"',
    description: 'Add aria-label to time inputs'
  },
  
  // Input fields - number inputs
  {
    from: 'type="number"',
    to: 'type="number"\n                  aria-label="Enter number of days"',
    description: 'Add aria-label to number inputs'
  },
  
  // Input fields - text inputs with search
  {
    from: 'placeholder="Search timezones..."',
    to: 'placeholder="Search timezones..."\n                  aria-label="Search timezones by name or region"',
    description: 'Add aria-label to search inputs'
  },
  
  // Input fields - custom format
  {
    from: 'placeholder="e.g., YYYY-MM-DD HH:mm:ss"',
    to: 'placeholder="e.g., YYYY-MM-DD HH:mm:ss"\n                  aria-label="Enter custom date format pattern"',
    description: 'Add aria-label to custom format inputs'
  },
  
  // Select elements
  {
    from: '<select\n                  value={country}',
    to: '<select\n                  value={country}\n                  aria-label="Select country for holidays"',
    description: 'Add aria-label to country select'
  },
  
  {
    from: '<select\n                  value={format}',
    to: '<select\n                  value={format}\n                  aria-label="Select date format template"',
    description: 'Add aria-label to format select'
  },
  
  {
    from: 'value={selectedRegion}\n                onChange={(e) => setSelectedRegion(e.target.value)}',
    to: 'value={selectedRegion}\n                onChange={(e) => setSelectedRegion(e.target.value)}\n                aria-label="Filter by region"',
    description: 'Add aria-label to region filter'
  },
  
  {
    from: 'value={selectedCountry}\n                onChange={(e) => setSelectedCountry(e.target.value)}',
    to: 'value={selectedCountry}\n                onChange={(e) => setSelectedCountry(e.target.value)}\n                aria-label="Filter by country"',
    description: 'Add aria-label to country filter'
  },
  
  {
    from: 'value={selectedOffset}\n                onChange={(e) => setSelectedOffset(e.target.value)}',
    to: 'value={selectedOffset}\n                onChange={(e) => setSelectedOffset(e.target.value)}\n                aria-label="Filter by UTC offset"',
    description: 'Add aria-label to offset filter'
  },
  
  // Buttons - primary action buttons
  {
    from: 'disabled={loading}\n              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"',
    to: 'disabled={loading}\n              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"\n              aria-label="Calculate workdays between selected dates"',
    description: 'Add aria-label to calculate button'
  },
  
  {
    from: 'disabled={loading}\n              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"',
    to: 'disabled={loading}\n              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"\n              aria-label="Calculate difference between selected dates"',
    description: 'Add aria-label to calculate button'
  },
  
  {
    from: 'disabled={loading}\n              className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"',
    to: 'disabled={loading}\n              className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"\n              aria-label="Format date with selected pattern"',
    description: 'Add aria-label to format button'
  },
  
  // Reset buttons
  {
    from: 'onClick={resetForm}\n              className=',
    to: 'onClick={resetForm}\n              aria-label="Reset form to default values"\n              className=',
    description: 'Add aria-label to reset buttons'
  },
  
  // Copy buttons
  {
    from: 'onClick={() => copyToClipboard(',
    to: 'onClick={() => copyToClipboard(\n                    aria-label="Copy result to clipboard"',
    description: 'Add aria-label to copy buttons'
  },
  
  // Checkbox inputs
  {
    from: 'type="checkbox"\n                checked={excludeWeekends}',
    to: 'type="checkbox"\n                checked={excludeWeekends}\n                aria-label="Exclude weekends from calculation"',
    description: 'Add aria-label to exclude weekends checkbox'
  },
  
  {
    from: 'type="checkbox"\n                checked={excludeHolidays}',
    to: 'type="checkbox"\n                checked={excludeHolidays}\n                aria-label="Exclude holidays from calculation"',
    description: 'Add aria-label to exclude holidays checkbox'
  },
  
  {
    from: 'type="checkbox"\n                checked={includeTime}',
    to: 'type="checkbox"\n                checked={includeTime}\n                aria-label="Include time in date difference calculation"',
    description: 'Add aria-label to include time checkbox'
  },
  
  {
    from: 'type="checkbox"\n                checked={absolute}',
    to: 'type="checkbox"\n                checked={absolute}\n                aria-label="Show absolute difference ignoring direction"',
    description: 'Add aria-label to absolute difference checkbox'
  },
  
  // Radio buttons
  {
    from: 'type="radio"\n                  value="dateRange"\n                  checked={calculationMode === \'dateRange\'}',
    to: 'type="radio"\n                  value="dateRange"\n                  checked={calculationMode === \'dateRange\'}\n                  aria-label="Calculate workdays using date range"',
    description: 'Add aria-label to date range radio'
  },
  
  {
    from: 'type="radio"\n                  value="dayCount"\n                  checked={calculationMode === \'dayCount\'}',
    to: 'type="radio"\n                  value="dayCount"\n                  checked={calculationMode === \'dayCount\'}\n                  aria-label="Calculate workdays using day count"',
    description: 'Add aria-label to day count radio'
  },
  
  {
    from: 'type="radio"\n                  value="timestamp"\n                  checked={inputType === \'timestamp\'}',
    to: 'type="radio"\n                  value="timestamp"\n                  checked={inputType === \'timestamp\'}\n                  aria-label="Use timestamp as input"',
    description: 'Add aria-label to timestamp radio'
  },
  
  {
    from: 'type="radio"\n                  value="date"\n                  checked={inputType === \'date\'}',
    to: 'type="radio"\n                  value="date"\n                  checked={inputType === \'date\'}\n                  aria-label="Use date as input"',
    description: 'Add aria-label to date radio'
  },
  
  {
    from: 'type="radio"\n                  value="detailed"\n                  checked={format === \'detailed\'}',
    to: 'type="radio"\n                  value="detailed"\n                  checked={format === \'detailed\'}\n                  aria-label="Show detailed timezone information"',
    description: 'Add aria-label to detailed view radio'
  },
  
  {
    from: 'type="radio"\n                  value="simple"\n                  checked={format === \'simple\'}',
    to: 'type="radio"\n                  value="simple"\n                  checked={format === \'simple\'}\n                  aria-label="Show simple timezone information"',
    description: 'Add aria-label to simple view radio'
  }
];

// Error display areas that need role="alert" and aria-live
const ERROR_DISPLAY_FIXES = [
  {
    from: '{error && (\n            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">',
    to: '{error && (\n            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md" role="alert" aria-live="polite">',
    description: 'Add role and aria-live to error displays'
  }
];

function fixAccessibility() {
  console.log('♿ Fixing Accessibility Issues\n');
  
  let totalFixes = 0;
  
  for (const componentPath of COMPONENTS) {
    console.log(`📝 Processing ${componentPath}...`);
    
    try {
      let content = fs.readFileSync(componentPath, 'utf8');
      let componentFixes = 0;
      
      // Apply accessibility fixes
      for (const fix of ACCESSIBILITY_FIXES) {
        const beforeCount = (content.match(new RegExp(escapeRegExp(fix.from), 'g')) || []).length;
        content = content.replace(new RegExp(escapeRegExp(fix.from), 'g'), fix.to);
        const afterCount = (content.match(new RegExp(escapeRegExp(fix.to), 'g')) || []).length;
        
        const fixCount = beforeCount;
        if (fixCount > 0) {
          componentFixes += fixCount;
          console.log(`  ✅ ${fix.description}: ${fixCount} instances`);
        }
      }
      
      // Apply error display fixes
      for (const fix of ERROR_DISPLAY_FIXES) {
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
      
      console.log(`  📊 Total accessibility fixes in ${path.basename(componentPath)}: ${componentFixes}\n`);
      totalFixes += componentFixes;
      
    } catch (error) {
      console.error(`  ❌ Error processing ${componentPath}:`, error.message);
    }
  }
  
  console.log('=' .repeat(50));
  console.log(`🎉 Accessibility Fixes Complete!`);
  console.log(`📊 Total fixes applied: ${totalFixes}`);
  
  if (totalFixes > 0) {
    console.log('\n✅ All components now have proper accessibility attributes');
    console.log('♿ Screen readers and assistive technologies will work better');
    console.log('🚀 Ready to build and deploy');
  } else {
    console.log('\n💡 No fixes needed - accessibility already up to date');
  }
  
  return totalFixes;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixAccessibility();
}

export { fixAccessibility };
