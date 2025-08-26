import { handleConvert } from '../../api-handlers/convert';

export async function onRequest({ request, env }: { request: Request; env: any }) {
  return handleConvert(request, env);
}

