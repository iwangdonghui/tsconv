// API configuration for different environments
export const getApiBaseUrl = (): string => {
  // Check if we have a configured API base URL
  const configuredUrl =
    import.meta.env.VITE_API_BASE_URL || (import.meta as any).env?.VITE_APT_BASE_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  // In development, use the proxy
  if (import.meta.env.DEV) {
    return ''; // Use relative URLs, Vite proxy will handle it
  }

  // In production, try to determine the API URL
  if (import.meta.env.PROD) {
    // Cloudflare-only: all production API calls go to /api (Pages Functions)
    return '/api';
  }

  // Fallback
  return '/api';
};

// Helper function to build API URLs safely (avoids double /api)
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();

  // Normalize base and endpoint
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');

  // If base ends with /api and endpoint starts with api/, remove duplicate
  if (/\/api$/i.test(normalizedBase) && /^api\//i.test(cleanEndpoint)) {
    return `${normalizedBase}/${cleanEndpoint.replace(/^api\//i, '')}`;
  }

  return `${normalizedBase}/${cleanEndpoint}`;
};

// API endpoints
export const API_ENDPOINTS = {
  FORMAT: 'api/format',
  FORMAT_TEMPLATES: 'api/format/templates',
  TIMEZONES: 'api/timezones',
  WORKDAYS: 'api/workdays',
  CONVERT: 'api/convert',
  HEALTH: 'api/health',
  DATE_DIFF: 'api/date-diff',
} as const;
