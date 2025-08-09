import { VercelRequest, VercelResponse } from '@vercel/node';
import { apiSecurityHeadersMiddleware } from './middleware/security-headers';
import { maximumSecurityHeadersMiddleware } from './middleware/enhanced-security-headers';
import { defaultAPISecurityMiddleware } from './middleware/api-security';
import { optionalAuthMiddleware } from './middleware/auth';

/**
 * Health Check API Endpoint
 *
 * GET /api/health - Basic health check
 * GET /api/health?detailed=true - Detailed health information
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services?: {
    api: ServiceStatus;
    timezone: ServiceStatus;
    format: ServiceStatus;
  };
  system?: {
    memory: MemoryInfo;
    nodeVersion: string;
    platform: string;
  };
}

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
  details?: any;
}

interface MemoryInfo {
  used: number;
  total: number;
  percentage: number;
}

// Simple health monitoring
const startTime = Date.now();

function getUptime(): number {
  return Date.now() - startTime;
}

function getMemoryInfo(): MemoryInfo {
  const memUsage = process.memoryUsage();
  const totalMemory = 1024 * 1024 * 1024; // 1GB assumption
  const percentage = (memUsage.heapUsed / totalMemory) * 100;

  return {
    used: memUsage.heapUsed,
    total: totalMemory,
    percentage: Math.round(percentage * 100) / 100
  };
}

async function checkServices(): Promise<HealthStatus['services']> {
  const now = new Date().toISOString();

  return {
    api: {
      status: 'healthy',
      responseTime: 1,
      lastCheck: now,
      details: { message: 'API is operational' }
    },
    timezone: await checkTimezoneService(),
    format: await checkFormatService()
  };
}

async function checkTimezoneService(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    // Simple timezone test
    const date = new Date();
    const utcTime = date.toISOString();
    const nyTime = date.toLocaleString('en-US', { timeZone: 'America/New_York' });

    return {
      status: 'healthy',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
      details: { utc: utcTime, ny: nyTime }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

async function checkFormatService(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    // Simple format test
    const date = new Date();
    const iso = date.toISOString();
    const utc = date.toUTCString();

    return {
      status: 'healthy',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
      details: { iso, utc }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

function calculateOverallStatus(services: HealthStatus['services']): HealthStatus['status'] {
  if (!services) return 'healthy';

  const serviceStatuses = Object.values(services).map(s => s.status);

  if (serviceStatuses.some(s => s === 'unhealthy')) {
    return 'unhealthy';
  }

  if (serviceStatuses.some(s => s === 'degraded')) {
    return 'degraded';
  }

  return 'healthy';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply enhanced security headers first (includes CSP and comprehensive security headers)
  maximumSecurityHeadersMiddleware(req, res);

  // Apply API security middleware (threat detection, input sanitization, etc.)
  defaultAPISecurityMiddleware(req, res, () => {
    // Apply optional authentication (allows both authenticated and anonymous access)
    optionalAuthMiddleware(req, res, () => {

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET method is allowed'
    });
  }

  try {
    const startTime = Date.now();
    const detailed = req.query.detailed === 'true';

    // Basic health status
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: getUptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    // Add detailed information if requested
    if (detailed) {
      const services = await checkServices();
      const overallStatus = calculateOverallStatus(services);

      healthStatus.status = overallStatus;
      healthStatus.services = services;
      healthStatus.system = {
        memory: getMemoryInfo(),
        nodeVersion: process.version,
        platform: process.platform
      };
    }

    // Set status code based on health
    const statusCode = healthStatus.status === 'unhealthy' ? 503 : 200;

    return res.status(statusCode).json({
      success: true,
      data: healthStatus,
      metadata: {
        processingTime: Date.now() - startTime,
        timestamp: Math.floor(Date.now() / 1000)
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
    });
  });
}

