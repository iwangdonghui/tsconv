import { handleV1Routes } from '../../../api-handlers/v1-router';

export const onRequestGet = ({ request, env }: { request: Request; env: any }) =>
  handleV1Routes(request, env, ['timezones']);

