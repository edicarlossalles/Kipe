import { VercelRequest } from '@vercel/node';

export function parseBody<T>(request: VercelRequest): T {
  if (typeof request.body === 'string') {
    return JSON.parse(request.body) as T;
  }

  return (request.body ?? {}) as T;
}
