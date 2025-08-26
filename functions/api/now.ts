import { handleNow } from '../../api-handlers/now';

export const onRequestGet = ({ request, env }: { request: Request; env: any }) =>
  handleNow(request, env);

