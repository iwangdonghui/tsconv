// Cloudflare Pages adapter for health API (Cache Busting Test)

interface Env {}

export async function handleHealth(request: Request, env: Env): Promise<Response> {
  return new Response(
    JSON.stringify({
      success: true,
      message:
        'This is the new version of the health check. If you see this, the cache was cleared.',
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
