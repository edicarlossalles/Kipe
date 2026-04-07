import { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from '../../src/firebase/adminApp.js';
import { requireUser } from '../../src/http/auth.js';
import { parseBody } from '../../src/http/request.js';
import { sendError, sendJson } from '../../src/http/response.js';
import { OpenFinanceStore } from '../../src/repositories/OpenFinanceStore.js';
import { OpenFinanceService } from '../../src/services/OpenFinanceService.js';

interface DisconnectBody {
  connectionId: string;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    if (request.method !== 'POST') {
      return sendError(response, 405, 'Method Not Allowed');
    }

    const user = await requireUser(request);
    const body = parseBody<DisconnectBody>(request);
    const service = new OpenFinanceService(new OpenFinanceStore(adminDb));
    const result = await service.disconnectConnection({
      uid: user.uid,
      connectionId: body.connectionId,
    });

    return sendJson(response, 200, result);
  } catch (error) {
    return sendError(response, 400, error instanceof Error ? error.message : 'Unexpected disconnect error');
  }
}
