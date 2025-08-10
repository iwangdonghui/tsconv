import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders } from '../utils/response';

interface TestRequest {
  test: 'health' | 'conversion' | 'cache' | 'ratelimit' | 'all';
  parameters?: Record<string, any>;
}

interface TestResult {
  test: string;
  success: boolean;
  responseTime: number;
  result?: any;
  error?: string;
  details?: Record<string, any>;
}

interface TestSuite {
  timestamp: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalTime: number;
  results: TestResult[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  const corsHeaders = createCorsHeaders(req.headers.origin as string);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Allow both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return APIErrorHandler.handleMethodNotAllowed(res, 'Only GET and POST methods are allowed');
  }

  try {
    const startTime = Date.now();
    let testRequest: TestRequest;

    if (req.method === 'GET') {
      // Default test suite for GET requests
      const testParam = (req.query.test as string) || 'all';
      const validTests = ['health', 'conversion', 'cache', 'ratelimit', 'all'];
      testRequest = {
        test: validTests.includes(testParam)
          ? (testParam as 'health' | 'conversion' | 'cache' | 'ratelimit' | 'all')
          : 'all',
        parameters: req.query,
      };
    } else {
      // Parse POST body
      testRequest = req.body || { test: 'all' };
    }

    const testSuite = await runTestSuite(testRequest);

    APIErrorHandler.sendSuccess(res, testSuite, {
      processingTime: Date.now() - startTime,
      itemCount: testSuite.totalTests,
      cacheHit: false,
    });
  } catch (error) {
    console.error('Test handler error:', error);
    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'test',
    });
  }
}

async function runTestSuite(request: TestRequest): Promise<TestSuite> {
  const startTime = Date.now();
  const results: TestResult[] = [];

  const testsToRun =
    request.test === 'all' ? ['health', 'conversion', 'cache', 'ratelimit'] : [request.test];

  for (const testName of testsToRun) {
    const result = await runSingleTest(testName, request.parameters);
    results.push(result);
  }

  const passedTests = results.filter(r => r.success).length;
  const failedTests = results.filter(r => !r.success).length;

  return {
    timestamp: Date.now(),
    totalTests: results.length,
    passedTests,
    failedTests,
    totalTime: Date.now() - startTime,
    results,
  };
}

async function runSingleTest(
  testName: string,
  parameters?: Record<string, any>
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    let result: any;
    let details: Record<string, any> = {};

    switch (testName) {
      case 'health':
        result = await testHealthEndpoint();
        details = { endpoint: '/api/health' };
        break;

      case 'conversion':
        result = await testConversionEndpoint(parameters);
        details = {
          endpoint: '/api/convert',
          testTimestamp: parameters?.timestamp || Date.now(),
        };
        break;

      case 'cache':
        result = await testCacheService();
        details = { service: 'cache' };
        break;

      case 'ratelimit':
        result = await testRateLimitService();
        details = { service: 'ratelimit' };
        break;

      default:
        throw new Error(`Unknown test: ${testName}`);
    }

    return {
      test: testName,
      success: true,
      responseTime: Date.now() - startTime,
      result,
      details,
    };
  } catch (error) {
    return {
      test: testName,
      success: false,
      responseTime: Date.now() - startTime,
      error: (error as Error).message,
      details: { error: (error as Error).stack },
    };
  }
}

async function testHealthEndpoint(): Promise<any> {
  // Simulate health check
  const services = {
    api: true,
    cache: await testCacheConnection(),
    ratelimit: await testRateLimitConnection(),
    conversion: true,
  };

  const allHealthy = Object.values(services).every(status => status === true);

  return {
    status: allHealthy ? 'healthy' : 'degraded',
    services,
    timestamp: Date.now(),
  };
}

async function testConversionEndpoint(parameters?: Record<string, any>): Promise<any> {
  const testTimestamp = parameters?.timestamp || Date.now();

  // Import conversion utilities
  const { convertTimestamp } = await import('../utils/conversion-utils');

  const result = await convertTimestamp(
    testTimestamp,
    ['iso', 'unix', 'human'],
    parameters?.timezone || 'UTC'
  );

  // Validate the conversion result
  if (!result || !result.formats) {
    throw new Error('Conversion failed: Invalid result format');
  }

  if (!result.formats.iso || !result.formats.unix || !result.formats.human) {
    throw new Error('Conversion failed: Missing required formats');
  }

  return {
    input: testTimestamp,
    output: result,
    validation: {
      hasIsoFormat: !!result.formats.iso,
      hasUnixFormat: !!result.formats.unix,
      hasHumanFormat: !!result.formats.human,
      timestampMatches: result.timestamp === testTimestamp,
    },
  };
}

async function testCacheService(): Promise<any> {
  try {
    const { createRedisClient } = await import('../services/redis-client');
    const redis = createRedisClient('cache');

    // Upstash Redis doesn't require explicit connection

    // Test cache operations
    const testKey = `test:cache:${Date.now()}`;
    const testValue = 'test-cache-value';

    // Test SET
    await redis.set(testKey, testValue, { ex: 10 }); // 10 second TTL

    // Test GET
    const retrievedValue = await redis.get(testKey);

    // Test EXISTS
    const exists = await redis.exists(testKey);

    // Test DELETE
    const deleted = await redis.del(testKey);

    // No need to disconnect with Upstash

    return {
      operations: {
        set: true,
        get: retrievedValue === testValue,
        exists: exists === 1,
        delete: deleted === 1,
      },
      testKey,
      testValue,
      retrievedValue,
    };
  } catch (error) {
    throw new Error(`Cache test failed: ${(error as Error).message}`);
  }
}

async function testRateLimitService(): Promise<any> {
  try {
    const { createRedisClient } = await import('../services/redis-client');
    const redis = createRedisClient('rate-limit');

    // Upstash Redis doesn't require explicit connection

    // Test rate limit operations
    const testKey = `test:ratelimit:${Date.now()}`;
    const testLimit = 10;
    const testWindow = 60;

    // Simulate rate limit check
    const currentCount = (await redis.get(testKey)) || '0';
    const count = parseInt(String(currentCount)) + 1;

    await redis.setex(testKey, testWindow, count.toString());

    const allowed = count <= testLimit;
    const remaining = Math.max(0, testLimit - count);

    // Clean up
    await redis.del(testKey);
    // No need to disconnect with Upstash

    return {
      testKey,
      limit: testLimit,
      window: testWindow,
      currentCount: count,
      allowed,
      remaining,
      operations: {
        get: true,
        set: true,
        delete: true,
      },
    };
  } catch (error) {
    throw new Error(`Rate limit test failed: ${(error as Error).message}`);
  }
}

async function testCacheConnection(): Promise<boolean> {
  try {
    const { createRedisClient } = await import('../services/redis-client');
    const redis = createRedisClient('cache');
    // Upstash Redis doesn't require explicit connection
    await redis.ping(); // Test connection
    // No need to disconnect with Upstash
    return true;
  } catch (error) {
    return false;
  }
}

async function testRateLimitConnection(): Promise<boolean> {
  try {
    const { createRedisClient } = await import('../services/redis-client');
    const redis = createRedisClient('rate-limit');
    // Upstash Redis doesn't require explicit connection
    await redis.ping(); // Test connection
    // No need to disconnect with Upstash
    return true;
  } catch (error) {
    return false;
  }
}
