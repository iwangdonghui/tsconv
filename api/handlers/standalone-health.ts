import { VercelRequest, VercelResponse } from '@vercel/node';

// Standalone health check with minimal dependencies
// This handler is designed to work independently without external services

interface StandaloneHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  version: string;
  environment: string;
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    node: {
      version: string;
      platform: string;
      arch: string;
    };
  };
  checks: {
    api: boolean;
    conversion: boolean;
    memory: boolean;
  };
  metadata: {
    standalone: true;
    processingTime: number;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Basic CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests for health check
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed. Use GET.',
      allowedMethods: ['GET']
    });
  }

  const startTime = Date.now();

  try {
    // Perform standalone health check
    const healthData = await performStandaloneHealthCheck();
    
    // Add processing time
    healthData.metadata.processingTime = Date.now() - startTime;

    // Set appropriate HTTP status based on health
    const httpStatus = healthData.status === 'healthy' ? 200 : 
                      healthData.status === 'degraded' ? 200 : 503;

    res.status(httpStatus).json(healthData);

  } catch (error) {
    console.error('Standalone health check error:', error);
    
    // Even if health check fails, we should return a response
    const errorHealthData: StandaloneHealthResponse = {
      status: 'unhealthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      system: getSystemInfo(),
      checks: {
        api: false,
        conversion: false,
        memory: false
      },
      metadata: {
        standalone: true,
        processingTime: Date.now() - startTime
      }
    };

    res.status(503).json(errorHealthData);
  }
}

async function performStandaloneHealthCheck(): Promise<StandaloneHealthResponse> {
  const timestamp = Date.now();
  const uptime = process.uptime();
  const version = process.env.npm_package_version || '1.0.0';
  const environment = process.env.NODE_ENV || 'development';
  const system = getSystemInfo();

  // Perform health checks
  const checks = {
    api: true, // If we reach this point, API is working
    conversion: await testConversionFunction(),
    memory: testMemoryUsage()
  };

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (!checks.conversion) {
    status = 'degraded';
  }
  
  if (!checks.memory) {
    status = status === 'healthy' ? 'degraded' : 'unhealthy';
  }

  // Additional system checks
  if (system.memory.percentage > 90) {
    status = status === 'healthy' ? 'degraded' : status;
  }

  if (uptime < 30) { // Less than 30 seconds uptime might indicate issues
    status = status === 'healthy' ? 'degraded' : status;
  }

  return {
    status,
    timestamp,
    uptime,
    version,
    environment,
    system,
    checks,
    metadata: {
      standalone: true,
      processingTime: 0 // Will be set by caller
    }
  };
}

function getSystemInfo() {
  const memUsage = process.memoryUsage();
  
  return {
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
    },
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };
}

async function testConversionFunction(): Promise<boolean> {
  try {
    // Test basic timestamp conversion functionality
    const testTimestamp = Math.floor(Date.now() / 1000);
    const testDate = new Date(testTimestamp * 1000);
    
    // Test basic date operations
    const isoString = testDate.toISOString();
    const unixTimestamp = Math.floor(testDate.getTime() / 1000);
    const humanReadable = testDate.toLocaleString();
    
    // Verify the conversions work
    if (!isoString || !unixTimestamp || !humanReadable) {
      return false;
    }

    // Test parsing back
    const parsedDate = new Date(isoString);
    if (isNaN(parsedDate.getTime())) {
      return false;
    }

    // Test timestamp parsing
    const timestampFromString = Math.floor(parsedDate.getTime() / 1000);
    if (Math.abs(timestampFromString - testTimestamp) > 1) { // Allow 1 second difference
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Conversion function test failed:', error);
    return false;
  }
}

function testMemoryUsage(): boolean {
  try {
    const memUsage = process.memoryUsage();
    
    // Check if memory usage is reasonable
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    
    // Fail if using more than 500MB heap or more than 95% of allocated heap
    if (heapUsedMB > 500 || (memUsage.heapUsed / memUsage.heapTotal) > 0.95) {
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Memory usage test failed:', error);
    return false;
  }
}

// Simple ping endpoint for basic connectivity testing
export async function ping(req: VercelRequest, res: VercelResponse) {
  // Basic CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  res.status(200).json({
    status: 'ok',
    message: 'pong',
    timestamp: Date.now(),
    responseTime: Date.now() - startTime,
    standalone: true
  });
}

// Status endpoint with minimal information
export async function status(req: VercelRequest, res: VercelResponse) {
  // Basic CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    status: 'operational',
    uptime: process.uptime(),
    timestamp: Date.now(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    standalone: true
  });
}