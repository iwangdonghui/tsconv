// API configuration for different environments
export const getApiBaseUrl = (): string => {
  // Check if we have a configured API base URL
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  // In development, use the proxy
  if (import.meta.env.DEV) {
    return '';  // Use relative URLs, Vite proxy will handle it
  }

  // In production, try to determine the API URL
  if (import.meta.env.PROD) {
    // For Cloudflare deployment, we need to use the deployed API
    // This should be configured via environment variables
    const currentHost = window.location.host;
    
    // If deployed on Cloudflare, try the Vercel API URL
    if (currentHost.includes('pages.dev') || currentHost.includes('cloudflare')) {
      // Use the production Vercel API URL
      return 'https://tsconv.vercel.app/api';
    }
    
    // If deployed on Vercel, use relative URLs
    if (currentHost.includes('vercel.app')) {
      return '/api';
    }
    
    // Default fallback for other deployments
    return '/api';
  }

  // Fallback
  return '/api';
};

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (baseUrl === '') {
    return `/${cleanEndpoint}`;
  }
  
  return `${baseUrl}/${cleanEndpoint}`;
};

// API endpoints
export const API_ENDPOINTS = {
  FORMAT: 'api/format',
  FORMAT_TEMPLATES: 'api/format/templates',
  TIMEZONES: 'api/timezones',
  WORKDAYS: 'api/workdays',
  CONVERT: 'api/convert',
  HEALTH: 'api/health',
} as const;
