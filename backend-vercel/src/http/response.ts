import { VercelResponse } from '@vercel/node';

export function sendJson(response: VercelResponse, status: number, payload: unknown) {
  response.status(status).json(payload);
}

export function sendError(response: VercelResponse, status: number, message: string) {
  response.status(status).json({ error: message });
}
