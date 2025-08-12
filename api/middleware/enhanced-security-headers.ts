/**
 * Enhanced Security Headers Middleware
 *
 * This middleware provides comprehensive HTTP security headers including
 * advanced security policies, privacy controls, and threat mitigation.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// Enhanced Security Headers Configuration
// ============================================================================

export interface EnhancedSecurityConfig {
  // Core security headers
  hsts?: {
    enabled?: boolean;
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };

  // Frame and embedding protection
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  frameAncestors?: string[];

  // Content type and XSS protection
  contentTypeOptions?: boolean;
  xssProtection?: {
    enabled?: boolean;
    mode?: 'block' | 'report';
    reportUri?: string;
  };

  // Referrer and privacy controls
  referrerPolicy?:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';

  // Feature/Permissions policy
  permissionsPolicy?: {
    camera?: string[];
    microphone?: string[];
    geolocation?: string[];
    payment?: string[];
    usb?: string[];
    magnetometer?: string[];
    gyroscope?: string[];
    accelerometer?: string[];
    fullscreen?: string[];
    pictureInPicture?: string[];
    displayCapture?: string[];
    documentDomain?: string[];
    encryptedMedia?: string[];
    executionWhileNotRendered?: string[];
    executionWhileOutOfViewport?: string[];
    gamepad?: string[];
    midi?: string[];
    notifications?: string[];
    publicKeyCredentialsGet?: string[];
    screenWakeLock?: string[];
    webShare?: string[];
    xrSpatialTracking?: string[];
  };

  // Cross-origin policies
  crossOriginEmbedderPolicy?: 'unsafe-none' | 'require-corp' | 'credentialless';
  crossOriginOpenerPolicy?: 'unsafe-none' | 'same-origin-allow-popups' | 'same-origin';
  crossOriginResourcePolicy?: 'same-site' | 'same-origin' | 'cross-origin';

  // DNS and network controls
  dnsPrefetchControl?: boolean;

  // IE specific headers
  downloadOptions?: boolean;
  crossDomainPolicies?: 'none' | 'master-only' | 'by-content-type' | 'by-ftp-filename' | 'all';

  // Server information
  serverHeader?: string | false;
  poweredByHeader?: boolean;

  // Timing and performance
  timingAllowOrigin?: string[];

  // Expect-CT (Certificate Transparency)
  expectCT?: {
    enabled?: boolean;
    maxAge?: number;
    enforce?: boolean;
    reportUri?: string;
  };

  // Clear-Site-Data
  clearSiteData?: {
    enabled?: boolean;
    types?: ('cache' | 'cookies' | 'storage' | 'executionContexts' | '*')[];
  };

  // Custom headers
  customHeaders?: Record<string, string>;
}

// ============================================================================
// Default Enhanced Security Configuration
// ============================================================================

const DEFAULT_ENHANCED_CONFIG: EnhancedSecurityConfig = {
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameOptions: 'DENY',
  contentTypeOptions: true,
  xssProtection: {
    enabled: true,
    mode: 'block',
  },
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: [],
    usb: [],
    magnetometer: [],
    gyroscope: [],
    accelerometer: [],
    fullscreen: ['self'],
    pictureInPicture: ['self'],
    displayCapture: [],
    documentDomain: [],
    encryptedMedia: ['self'],
    executionWhileNotRendered: ['self'],
    executionWhileOutOfViewport: ['self'],
    gamepad: [],
    midi: [],
    notifications: ['self'],
    publicKeyCredentialsGet: ['self'],
    screenWakeLock: [],
    webShare: ['self'],
    xrSpatialTracking: [],
  },
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
  dnsPrefetchControl: false,
  downloadOptions: true,
  crossDomainPolicies: 'none',
  serverHeader: false,
  poweredByHeader: false,
  timingAllowOrigin: [],
  expectCT: {
    enabled: false,
    maxAge: 86400,
    enforce: false,
  },
  clearSiteData: {
    enabled: false,
    types: [],
  },
};

// ============================================================================
// Header Building Functions
// ============================================================================

/**
 * Builds HSTS header value
 */
function buildHSTSHeader(config: EnhancedSecurityConfig['hsts']): string {
  if (!config?.enabled) return '';

  let value = `max-age=${config.maxAge || 31536000}`;

  if (config.includeSubDomains) {
    value += '; includeSubDomains';
  }

  if (config.preload) {
    value += '; preload';
  }

  return value;
}

/**
 * Builds XSS Protection header value
 */
function buildXSSProtectionHeader(config: EnhancedSecurityConfig['xssProtection']): string {
  if (!config?.enabled) return '0';

  let value = '1';

  if (config.mode === 'block') {
    value += '; mode=block';
  } else if (config.mode === 'report' && config.reportUri) {
    value += `; report=${config.reportUri}`;
  }

  return value;
}

/**
 * Builds Permissions Policy header value
 */
function buildPermissionsPolicyHeader(config: EnhancedSecurityConfig['permissionsPolicy']): string {
  if (!config) return '';

  const policies: string[] = [];

  Object.entries(config).forEach(([feature, allowlist]) => {
    if (Array.isArray(allowlist)) {
      if (allowlist.length === 0) {
        policies.push(`${feature}=()`);
      } else {
        const formattedList = allowlist
          .map(origin => (origin === 'self' ? "'self'" : `"${origin}"`))
          .join(' ');
        policies.push(`${feature}=(${formattedList})`);
      }
    }
  });

  return policies.join(', ');
}

/**
 * Builds Expect-CT header value
 */
function buildExpectCTHeader(config: EnhancedSecurityConfig['expectCT']): string {
  if (!config?.enabled) return '';

  let value = `max-age=${config.maxAge || 86400}`;

  if (config.enforce) {
    value += ', enforce';
  }

  if (config.reportUri) {
    value += `, report-uri="${config.reportUri}"`;
  }

  return value;
}

/**
 * Builds Clear-Site-Data header value
 */
function buildClearSiteDataHeader(config: EnhancedSecurityConfig['clearSiteData']): string {
  if (!config?.enabled || !config.types?.length) return '';

  return config.types.map(type => `"${type}"`).join(', ');
}

/**
 * Builds Timing-Allow-Origin header value
 */
function buildTimingAllowOriginHeader(origins: string[]): string {
  if (!origins?.length) return '';
  return origins.join(', ');
}

// ============================================================================
// Enhanced Security Headers Middleware
// ============================================================================

/**
 * Creates enhanced security headers middleware
 */
export function createEnhancedSecurityHeadersMiddleware(customConfig: EnhancedSecurityConfig = {}) {
  const environment = process.env.NODE_ENV || 'production';
  const finalConfig = { ...DEFAULT_ENHANCED_CONFIG, ...customConfig };

  return (req: VercelRequest, res: VercelResponse, next?: () => void) => {
    const isSecure =
      req.headers['x-forwarded-proto'] === 'https' ||
      req.headers['x-forwarded-ssl'] === 'on' ||
      (req.connection as any)?.encrypted;

    // HSTS (only for HTTPS)
    if (isSecure && finalConfig.hsts?.enabled) {
      const hstsValue = buildHSTSHeader(finalConfig.hsts);
      if (hstsValue) {
        res.setHeader('Strict-Transport-Security', hstsValue);
      }
    }

    // Frame Options
    if (finalConfig.frameOptions) {
      res.setHeader('X-Frame-Options', finalConfig.frameOptions);
    }

    // Content Type Options
    if (finalConfig.contentTypeOptions) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // XSS Protection
    if (finalConfig.xssProtection) {
      const xssValue = buildXSSProtectionHeader(finalConfig.xssProtection);
      res.setHeader('X-XSS-Protection', xssValue);
    }

    // Referrer Policy
    if (finalConfig.referrerPolicy) {
      res.setHeader('Referrer-Policy', finalConfig.referrerPolicy);
    }

    // Permissions Policy
    if (finalConfig.permissionsPolicy) {
      const permissionsValue = buildPermissionsPolicyHeader(finalConfig.permissionsPolicy);
      if (permissionsValue) {
        res.setHeader('Permissions-Policy', permissionsValue);
      }
    }

    // Cross-Origin Policies
    if (finalConfig.crossOriginEmbedderPolicy) {
      res.setHeader('Cross-Origin-Embedder-Policy', finalConfig.crossOriginEmbedderPolicy);
    }

    if (finalConfig.crossOriginOpenerPolicy) {
      res.setHeader('Cross-Origin-Opener-Policy', finalConfig.crossOriginOpenerPolicy);
    }

    if (finalConfig.crossOriginResourcePolicy) {
      res.setHeader('Cross-Origin-Resource-Policy', finalConfig.crossOriginResourcePolicy);
    }

    // DNS Prefetch Control
    if (finalConfig.dnsPrefetchControl !== undefined) {
      res.setHeader('X-DNS-Prefetch-Control', finalConfig.dnsPrefetchControl ? 'on' : 'off');
    }

    // IE Download Options
    if (finalConfig.downloadOptions) {
      res.setHeader('X-Download-Options', 'noopen');
    }

    // Cross Domain Policies
    if (finalConfig.crossDomainPolicies) {
      res.setHeader('X-Permitted-Cross-Domain-Policies', finalConfig.crossDomainPolicies);
    }

    // Server Header
    if (finalConfig.serverHeader === false) {
      res.removeHeader('Server');
    } else if (typeof finalConfig.serverHeader === 'string') {
      res.setHeader('Server', finalConfig.serverHeader);
    }

    // Powered By Header
    if (!finalConfig.poweredByHeader) {
      res.removeHeader('X-Powered-By');
    }

    // Timing Allow Origin
    if (finalConfig.timingAllowOrigin?.length) {
      const timingValue = buildTimingAllowOriginHeader(finalConfig.timingAllowOrigin);
      res.setHeader('Timing-Allow-Origin', timingValue);
    }

    // Expect-CT (only for HTTPS)
    if (isSecure && finalConfig.expectCT?.enabled) {
      const expectCTValue = buildExpectCTHeader(finalConfig.expectCT);
      if (expectCTValue) {
        res.setHeader('Expect-CT', expectCTValue);
      }
    }

    // Clear-Site-Data
    if (finalConfig.clearSiteData?.enabled) {
      const clearSiteDataValue = buildClearSiteDataHeader(finalConfig.clearSiteData);
      if (clearSiteDataValue) {
        res.setHeader('Clear-Site-Data', clearSiteDataValue);
      }
    }

    // Custom Headers
    if (finalConfig.customHeaders) {
      Object.entries(finalConfig.customHeaders).forEach(([name, value]) => {
        res.setHeader(name, value);
      });
    }

    // Add debug information in development
    if (environment === 'development') {
      const appliedHeaders = Object.keys(res.getHeaders()).filter(
        name =>
          name.toLowerCase().includes('x-') ||
          name.toLowerCase().includes('strict-transport') ||
          name.toLowerCase().includes('referrer') ||
          name.toLowerCase().includes('permissions') ||
          name.toLowerCase().includes('cross-origin') ||
          name.toLowerCase().includes('expect-ct') ||
          name.toLowerCase().includes('clear-site-data')
      );
      res.setHeader('X-Enhanced-Security-Headers-Count', appliedHeaders.length.toString());
      res.setHeader('X-Enhanced-Security-Environment', environment);
    }

    if (next) {
      return next();
    }

    return undefined;
  };
}

// ============================================================================
// Predefined Middleware Configurations
// ============================================================================

/**
 * Maximum security configuration for production
 */
export const maximumSecurityHeadersMiddleware = createEnhancedSecurityHeadersMiddleware({
  hsts: {
    enabled: true,
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
  frameOptions: 'DENY',
  contentTypeOptions: true,
  xssProtection: {
    enabled: true,
    mode: 'block',
  },
  referrerPolicy: 'no-referrer',
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
  dnsPrefetchControl: false,
  expectCT: {
    enabled: true,
    maxAge: 86400,
    enforce: true,
  },
});

/**
 * Balanced security configuration
 */
export const balancedSecurityHeadersMiddleware = createEnhancedSecurityHeadersMiddleware({
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: false,
  },
  frameOptions: 'SAMEORIGIN',
  referrerPolicy: 'strict-origin-when-cross-origin',
  crossOriginEmbedderPolicy: 'unsafe-none',
  crossOriginResourcePolicy: 'same-site',
});

/**
 * Development-friendly configuration
 */
export const developmentSecurityHeadersMiddleware = createEnhancedSecurityHeadersMiddleware({
  hsts: {
    enabled: false,
  },
  frameOptions: 'SAMEORIGIN',
  crossOriginEmbedderPolicy: 'unsafe-none',
  crossOriginOpenerPolicy: 'unsafe-none',
  crossOriginResourcePolicy: 'cross-origin',
  dnsPrefetchControl: true,
  expectCT: {
    enabled: false,
  },
});

// ============================================================================
// Exports
// ============================================================================

export {
  buildClearSiteDataHeader,
  buildExpectCTHeader,
  buildHSTSHeader,
  buildPermissionsPolicyHeader,
  buildTimingAllowOriginHeader,
  buildXSSProtectionHeader,
  DEFAULT_ENHANCED_CONFIG,
};
