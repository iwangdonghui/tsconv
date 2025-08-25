// Cloudflare Pages adapter for now API (Debug Version)

interface Env {}

export async function handleNow(request: Request, env: Env): Promise<Response> {
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Now API is running (debug version)',
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
