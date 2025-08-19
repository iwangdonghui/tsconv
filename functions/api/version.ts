export const onRequestGet = async () => {
  const body = {
    success: true,
    data: {
      version: process.env.GIT_COMMIT_SHA || 'unknown',
      buildTime: new Date().toISOString(),
      runtime: 'cloudflare-pages-functions',
    },
  };
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
};
