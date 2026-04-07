import { VercelRequest, VercelResponse } from '@vercel/node';
import { getEnvironment } from '../../src/config/environment.js';
import { adminDb } from '../../src/firebase/adminApp.js';
import { sendError, sendJson } from '../../src/http/response.js';
import { OpenFinanceStore } from '../../src/repositories/OpenFinanceStore.js';
import { OpenFinanceService } from '../../src/services/OpenFinanceService.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    if (request.method !== 'POST') {
      return sendError(response, 405, 'Method Not Allowed');
    }

    const environment = getEnvironment();
    if (environment.pluggyWebhookSecret) {
      const incomingSecret = request.headers.authorization ?? request.headers['x-webhook-secret'];
      if (incomingSecret !== environment.pluggyWebhookSecret) {
        return sendError(response, 401, 'Unauthorized');
      }
    }

    const payload = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : (request.body ?? {});

    const service = new OpenFinanceService(new OpenFinanceStore(adminDb));
    const result = await service.processWebhook(payload);
    return sendJson(response, 202, result);
  } catch (error) {
    return sendError(response, 400, error instanceof Error ? error.message : 'Unexpected webhook error');
  }
}
