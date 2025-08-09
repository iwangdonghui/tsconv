/**
 * Service Worker for TSConv - Advanced Caching Strategy
 * 
 * This service worker implements a comprehensive caching strategy for optimal performance:
 * - Cache First: Static assets (JS, CSS, images, fonts)
 * - Network First: HTML pages and API calls
 * - Stale While Revalidate: JSON data and dynamic content
 */

const CACHE_NAME = 'tsconv-v1.0.0';
const STATIC_CACHE = 'tsconv-static-v1.0.0';
const DYNAMIC_CACHE = 'tsconv-dynamic-v1.0.0';
const API_CACHE = 'tsconv-api-v1.0.0';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/optimized/favicon-32x32.png',
  '/optimized/favicon-16x16.png',
  '/optimized/apple-touch-icon.png'
];

// Cache strategies for different asset types
const CACHE_STRATEGIES = {
  // Cache First - for static assets that rarely change
  CACHE_FIRST: [
    /\.(?:js|css|woff2?|ttf|eot)$/,
    /\/assets\//,
    /\/optimized\//,
    /\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico)$/
  ],
  
  // Network First - for HTML and critical dynamic content
  NETWORK_FIRST: [
    /\.html$/,
    /\/$/,
    /\/api\/health/
  ],
  
  // Stale While Revalidate - for JSON data and semi-dynamic content
  STALE_WHILE_REVALIDATE: [
    /\.json$/,
    /\/api\//,
    /\/formats\.json/,
    /\/health\.json/
  ]
};

// Cache durations
const CACHE_DURATIONS = {
  STATIC: 365 * 24 * 60 * 60 * 1000, // 1 year
  DYNAMIC: 7 * 24 * 60 * 60 * 1000,  // 1 week
  API: 1 * 60 * 60 * 1000,           // 1 hour
  HTML: 1 * 60 * 60 * 1000           // 1 hour
};

/**
 * Determines cache strategy for a given URL
 */
function getCacheStrategy(url) {
  const urlPath = new URL(url).pathname;
  
  for (const pattern of CACHE_STRATEGIES.CACHE_FIRST) {
    if (pattern.test(urlPath)) {
      return 'CACHE_FIRST';
    }
  }
  
  for (const pattern of CACHE_STRATEGIES.NETWORK_FIRST) {
    if (pattern.test(urlPath)) {
      return 'NETWORK_FIRST';
    }
  }
  
  for (const pattern of CACHE_STRATEGIES.STALE_WHILE_REVALIDATE) {
    if (pattern.test(urlPath)) {
      return 'STALE_WHILE_REVALIDATE';
    }
  }
  
  return 'NETWORK_FIRST'; // Default strategy
}

/**
 * Gets appropriate cache name for URL
 */
function getCacheName(url) {
  const strategy = getCacheStrategy(url);
  const urlPath = new URL(url).pathname;
  
  if (strategy === 'CACHE_FIRST') {
    return STATIC_CACHE;
  } else if (urlPath.includes('/api/')) {
    return API_CACHE;
  } else {
    return DYNAMIC_CACHE;
  }
}

/**
 * Checks if cached response is still fresh
 */
function isCacheFresh(cachedResponse, maxAge) {
  if (!cachedResponse) return false;
  
  const cachedDate = new Date(cachedResponse.headers.get('sw-cached-date'));
  const now = new Date();
  
  return (now.getTime() - cachedDate.getTime()) < maxAge;
}

/**
 * Adds timestamp to response for cache freshness checking
 */
function addCacheTimestamp(response) {
  const responseClone = response.clone();
  const headers = new Headers(responseClone.headers);
  headers.set('sw-cached-date', new Date().toISOString());
  
  return new Response(responseClone.body, {
    status: responseClone.status,
    statusText: responseClone.statusText,
    headers: headers
  });
}

/**
 * Cache First Strategy
 */
async function cacheFirst(request) {
  const cacheName = getCacheName(request.url);
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && isCacheFresh(cachedResponse, CACHE_DURATIONS.STATIC)) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = addCacheTimestamp(networkResponse);
      cache.put(request, responseToCache.clone());
      return networkResponse;
    }
  } catch (error) {
    console.warn('Network failed, serving from cache:', error);
  }
  
  return cachedResponse || new Response('Asset not available offline', { status: 503 });
}

/**
 * Network First Strategy
 */
async function networkFirst(request) {
  const cacheName = getCacheName(request.url);
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = addCacheTimestamp(networkResponse);
      cache.put(request, responseToCache.clone());
      return networkResponse;
    }
  } catch (error) {
    console.warn('Network failed, trying cache:', error);
  }
  
  const cachedResponse = await cache.match(request);
  return cachedResponse || new Response('Content not available offline', { status: 503 });
}

/**
 * Stale While Revalidate Strategy
 */
async function staleWhileRevalidate(request) {
  const cacheName = getCacheName(request.url);
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch from network in background
  const networkResponsePromise = fetch(request).then(response => {
    if (response.ok) {
      const responseToCache = addCacheTimestamp(response);
      cache.put(request, responseToCache.clone());
    }
    return response;
  }).catch(error => {
    console.warn('Background fetch failed:', error);
    return null;
  });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If no cache, wait for network
  return await networkResponsePromise || new Response('Content not available', { status: 503 });
}

/**
 * Clean old caches
 */
async function cleanOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];
  
  return Promise.all(
    cacheNames.map(cacheName => {
      if (!currentCaches.includes(cacheName)) {
        console.log('Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}

/**
 * Precache essential assets
 */
async function precacheAssets() {
  const cache = await caches.open(STATIC_CACHE);
  
  return Promise.all(
    PRECACHE_ASSETS.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const responseToCache = addCacheTimestamp(response);
          await cache.put(url, responseToCache);
          console.log('Precached:', url);
        }
      } catch (error) {
        console.warn('Failed to precache:', url, error);
      }
    })
  );
}

// ============================================================================
// Service Worker Event Handlers
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      precacheAssets(),
      self.skipWaiting()
    ])
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      cleanOldCaches(),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  const strategy = getCacheStrategy(event.request.url);
  
  switch (strategy) {
    case 'CACHE_FIRST':
      event.respondWith(cacheFirst(event.request));
      break;
    case 'NETWORK_FIRST':
      event.respondWith(networkFirst(event.request));
      break;
    case 'STALE_WHILE_REVALIDATE':
      event.respondWith(staleWhileRevalidate(event.request));
      break;
    default:
      event.respondWith(networkFirst(event.request));
  }
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    // Handle any offline actions that need to be synced
  }
});

// Handle push notifications (future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('Push notification received:', data);
    
    // Show notification (if needed in future)
    // event.waitUntil(
    //   self.registration.showNotification(data.title, {
    //     body: data.body,
    //     icon: '/optimized/android-chrome-192x192.png'
    //   })
    // );
  }
});

console.log('TSConv Service Worker loaded successfully');
