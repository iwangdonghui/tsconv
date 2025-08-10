#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Accessibility Testing Script
 * Tests color contrast ratios for dark theme compliance
 */

// WCAG 2.1 AA standard requires:
// - Normal text: 4.5:1 contrast ratio
// - Large text (18pt+ or 14pt+ bold): 3:1 contrast ratio

const colorTests = [
  // Light theme colors
  {
    name: 'Light theme - Normal text',
    background: 'hsl(0, 0%, 100%)', // --background
    foreground: 'hsl(222.2, 84%, 4.9%)', // --foreground
    requiredRatio: 4.5,
  },
  {
    name: 'Light theme - Muted text',
    background: 'hsl(0, 0%, 100%)', // --background
    foreground: 'hsl(215.4, 16.3%, 46.9%)', // --muted-foreground
    requiredRatio: 4.5,
  },
  {
    name: 'Light theme - Primary button',
    background: 'hsl(221.2, 83.2%, 53.3%)', // --primary
    foreground: 'hsl(210, 40%, 98%)', // --primary-foreground
    requiredRatio: 4.5,
  },

  // Dark theme colors
  {
    name: 'Dark theme - Normal text',
    background: 'hsl(222.2, 84%, 4.9%)', // --background (dark)
    foreground: 'hsl(210, 40%, 98%)', // --foreground (dark)
    requiredRatio: 4.5,
  },
  {
    name: 'Dark theme - Muted text',
    background: 'hsl(222.2, 84%, 4.9%)', // --background (dark)
    foreground: 'hsl(215, 20.2%, 65.1%)', // --muted-foreground (dark)
    requiredRatio: 4.5,
  },
  {
    name: 'Dark theme - Primary button',
    background: 'hsl(217.2, 91.2%, 59.8%)', // --primary (dark)
    foreground: 'hsl(222.2, 84%, 4.9%)', // --primary-foreground (dark)
    requiredRatio: 4.5,
  },
  {
    name: 'Dark theme - Input fields',
    background: 'hsl(217.2, 32.6%, 17.5%)', // --input (dark)
    foreground: 'hsl(210, 40%, 98%)', // --foreground (dark)
    requiredRatio: 4.5,
  },
  {
    name: 'Dark theme - Card background',
    background: 'hsl(222.2, 84%, 4.9%)', // --card (dark)
    foreground: 'hsl(210, 40%, 98%)', // --card-foreground (dark)
    requiredRatio: 4.5,
  },
];

// Convert HSL to RGB
function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;

  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / (1 / 12)) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };

  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

// Parse HSL string
function parseHsl(hslString) {
  const match = hslString.match(/hsl\(([^)]+)\)/);
  if (!match) return null;

  const values = match[1].split(',').map(v => parseFloat(v.trim().replace('%', '')));
  return { h: values[0], s: values[1], l: values[2] };
}

// Calculate relative luminance
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio
function getContrastRatio(color1, color2) {
  const hsl1 = parseHsl(color1);
  const hsl2 = parseHsl(color2);

  if (!hsl1 || !hsl2) return 0;

  const rgb1 = hslToRgb(hsl1.h, hsl1.s, hsl1.l);
  const rgb2 = hslToRgb(hsl2.h, hsl2.s, hsl2.l);

  const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

// Run tests
console.log('🎨 Testing Color Contrast Ratios for Accessibility\n');

let passedTests = 0;
let totalTests = colorTests.length;

colorTests.forEach(test => {
  const ratio = getContrastRatio(test.background, test.foreground);
  const passed = ratio >= test.requiredRatio;

  console.log(`${passed ? '✅' : '❌'} ${test.name}`);
  console.log(`   Contrast ratio: ${ratio.toFixed(2)}:1 (required: ${test.requiredRatio}:1)`);
  console.log(`   Background: ${test.background}`);
  console.log(`   Foreground: ${test.foreground}\n`);

  if (passed) passedTests++;
});

console.log(`📊 Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All accessibility tests passed!');
  process.exit(0);
} else {
  console.log('⚠️  Some accessibility tests failed. Please review the color combinations.');
  process.exit(1);
}
