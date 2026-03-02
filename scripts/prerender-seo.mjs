/**
 * Post-build SEO Prerender Script
 *
 * Generates per-route HTML files with correct SEO meta tags injected.
 * This ensures Googlebot sees the correct title, description, canonical,
 * and structured data for each page on first crawl (before JS renders).
 *
 * Usage: node scripts/prerender-seo.mjs
 * Called automatically by `npm run build` via postbuild.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIST_DIR = join(process.cwd(), 'dist');
const BASE_URL = 'https://tsconv.com';

// Route-specific SEO configuration
const ROUTES = [
  {
    path: '/discord',
    title: 'Discord Timestamp Generator — Free One-Click Copy | tsconv.com',
    description: 'Free Discord timestamp generator. Create dynamic time codes like <t:timestamp:F> that auto-convert to each user\'s timezone. 7 formats, one-click copy. Works for bots, events & announcements.',
    keywords: 'discord timestamp generator, discord time code, discord timestamp converter, dynamic time discord, discord dynamic time, discord timestamp, discord bot timestamp, discord event time',
    ogTitle: 'Discord Timestamp Generator — Free Online Tool | tsconv.com',
    ogDescription: 'Generate and copy Discord dynamic time codes instantly. 7 formats including relative time. Free, no login required.',
    schema: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Discord Timestamp Generator",
      "url": "https://tsconv.com/discord",
      "applicationCategory": "UtilitiesApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "description": "Free Discord timestamp generator. Create dynamic time codes that auto-convert to each user's timezone. 7 formats with one-click copy."
    }
  },
  {
    path: '/format',
    title: 'Date Format Tool - Custom Date Formatting | tsconv.com',
    description: 'Format dates in any pattern. Convert between date formats including ISO 8601, RFC 2822, Unix timestamps, and custom patterns. Free online tool.',
    keywords: 'date format tool, date formatting, ISO 8601, RFC 2822, custom date format, date parser',
    ogTitle: 'Date Format Tool | tsconv.com',
    ogDescription: 'Format dates in any pattern. Free online date formatter with real-time preview.'
  },
  {
    path: '/workdays',
    title: 'Workdays Calculator - Business Days Counter | tsconv.com',
    description: 'Calculate business days between dates. Count working days excluding weekends and holidays. Free online workdays calculator with holiday support.',
    keywords: 'workdays calculator, business days counter, working days calculator, date difference business days',
    ogTitle: 'Workdays Calculator | tsconv.com',
    ogDescription: 'Calculate business days between dates, excluding weekends and holidays.'
  },
  {
    path: '/date-diff',
    title: 'Date Difference Calculator - Time Between Dates | tsconv.com',
    description: 'Calculate the exact difference between two dates in years, months, days, hours, minutes, and seconds. Free online date difference calculator.',
    keywords: 'date difference calculator, time between dates, days between dates, date duration calculator',
    ogTitle: 'Date Difference Calculator | tsconv.com',
    ogDescription: 'Calculate the exact time between two dates in years, months, days, and more.'
  },
  {
    path: '/timezones',
    title: 'Timezone Explorer - World Time Zones | tsconv.com',
    description: 'Explore world time zones with current times, UTC offsets, DST status, and more. Search and compare timezones across countries and regions.',
    keywords: 'timezone explorer, world time zones, UTC offset, DST, timezone converter, timezone list',
    ogTitle: 'Timezone Explorer | tsconv.com',
    ogDescription: 'Explore world time zones with current times, UTC offsets, and DST status.'
  },
  {
    path: '/time-units',
    title: 'Time Units Converter - Convert Seconds, Minutes, Hours | tsconv.com',
    description: 'Convert between time units: seconds, minutes, hours, days, weeks, months, and years. Free online time unit conversion calculator.',
    keywords: 'time units converter, seconds to minutes, hours to days, time conversion calculator',
    ogTitle: 'Time Units Converter | tsconv.com',
    ogDescription: 'Convert between time units: seconds, minutes, hours, days, weeks, and more.'
  },
  {
    path: '/api',
    title: 'API Documentation - Timestamp Converter | tsconv.com',
    description: 'REST API documentation for programmatic timestamp conversion. Convert Unix timestamps, ISO dates, and more via simple HTTP requests.',
    keywords: 'timestamp API, unix timestamp API, date conversion API, REST API',
    ogTitle: 'API Documentation | tsconv.com',
    ogDescription: 'REST API for programmatic timestamp and date conversion.'
  },
  {
    path: '/guide',
    title: 'Developer Guides - Timestamp Converter | tsconv.com',
    description: 'Comprehensive guides on working with timestamps, timezones, and date handling in JavaScript, Python, databases, and more.',
    keywords: 'timestamp guide, unix timestamp tutorial, datetime guide, timezone handling',
    ogTitle: 'Developer Guides | tsconv.com',
    ogDescription: 'Learn about timestamps, timezones, and date handling across platforms.'
  },
  {
    path: '/how-to',
    title: 'How To Guides - Timestamp Converter | tsconv.com',
    description: 'Step-by-step how-to guides for timestamp conversion, timezone handling, date formatting, and database operations.',
    keywords: 'timestamp how-to, date conversion tutorial, timezone conversion guide',
    ogTitle: 'How-To Guides | tsconv.com',
    ogDescription: 'Step-by-step guides for timestamp conversion and date handling.'
  }
];

function injectSEO(html, route) {
  const canonical = `${BASE_URL}${route.path}`;

  // Replace title
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(route.title)}</title>`
  );

  // Replace meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeAttr(route.description)}" />`
  );

  // Replace keywords
  if (route.keywords) {
    html = html.replace(
      /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/,
      `<meta name="keywords" content="${escapeAttr(route.keywords)}" />`
    );
  }

  // Replace canonical URL
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`
  );

  // Replace OG tags
  if (route.ogTitle) {
    html = html.replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${escapeAttr(route.ogTitle)}" />`
    );
  }

  if (route.ogDescription) {
    html = html.replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${escapeAttr(route.ogDescription)}" />`
    );
  }

  // Replace og:url
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonical}" />`
  );

  // Replace twitter title and description
  if (route.ogTitle) {
    html = html.replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
      `<meta name="twitter:title" content="${escapeAttr(route.ogTitle)}" />`
    );
  }

  if (route.ogDescription) {
    html = html.replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="twitter:description" content="${escapeAttr(route.ogDescription)}" />`
    );
  }

  // Add route-specific JSON-LD schema if provided
  if (route.schema) {
    const schemaScript = `<script type="application/ld+json">${JSON.stringify(route.schema)}</script>`;
    html = html.replace('</head>', `    ${schemaScript}\n  </head>`);
  }

  return html;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Main execution
const baseHtml = readFileSync(join(DIST_DIR, 'index.html'), 'utf-8');
let generated = 0;

for (const route of ROUTES) {
  const routeDir = join(DIST_DIR, route.path);
  const routeFile = join(routeDir, 'index.html');

  // Create directory if it doesn't exist
  if (!existsSync(routeDir)) {
    mkdirSync(routeDir, { recursive: true });
  }

  // Generate HTML with injected SEO
  const html = injectSEO(baseHtml, route);
  writeFileSync(routeFile, html, 'utf-8');
  generated++;

  console.log(`✅ ${route.path}/index.html — "${route.title.substring(0, 50)}..."`);
}

console.log(`\n🎉 Pre-rendered ${generated} routes with SEO meta tags.`);
