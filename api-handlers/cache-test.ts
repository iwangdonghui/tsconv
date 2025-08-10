// Simple cache test endpoint

import { CacheManager } from './cache-utils';

interface Env {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  REDIS_ENABLED?: string;
}

export async function handleCacheTest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({
        error: 'Method Not Allowed',
        message: 'Only GET method is supported',
      }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const cacheManager = new CacheManager(env);
    const testKey = `test-key-${Date.now()}`;
    const testValue = { message: 'Hello Cache!', timestamp: new Date().toISOString() };

    // Test 1: Set a value
    console.log(`Setting cache key: ${testKey}`);
    const setResult = await cacheManager.set('CONVERT_API', testKey, testValue);
    console.log(`Set result: ${setResult}`);

    // Test 2: Get the value immediately
    console.log(`Getting cache key: ${testKey}`);
    const getResult = await cacheManager.get('CONVERT_API', testKey);
    console.log(`Get result: ${getResult ? 'FOUND' : 'NOT FOUND'}`);

    // Test 3: Redis stats
    const redisStats = cacheManager.getRedisStats();
    const cacheStats = cacheManager.getStats();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          test: {
            key: testKey,
            setValue: testValue,
            setResult,
            getValue: getResult,
            cacheWorking: !!getResult && JSON.stringify(getResult) === JSON.stringify(testValue),
          },
          redis: redisStats,
          cache: cacheStats,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Cache test error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
