import { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from '../../src/firebase/adminApp.js';
import { requireUser } from '../../src/http/auth.js';
import { parseBody } from '../../src/http/request.js';
import { sendError, sendJson } from '../../src/http/response.js';
import { OpenFinanceStore } from '../../src/repositories/OpenFinanceStore.js';
import { OpenFinanceService } from '../../src/services/OpenFinanceService.js';

interface ConnectBody {
  institutionKey: string;
  institutionName: string;
  documentNumber: string;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    if (request.method !== 'POST') {
      return sendError(response, 405, 'Method Not Allowed');
    }

    const user = await requireUser(request);
    const body = parseBody<ConnectBody>(request);
    const service = new OpenFinanceService(new OpenFinanceStore(adminDb));
    const connection = await service.createConnection({
      uid: user.uid,
      institutionKey: body.institutionKey,
      institutionName: body.institutionName,
      documentNumber: body.documentNumber,
    });

    return sendJson(response, 200, { connection });
  } catch (error) {
    return sendError(response, 400, error instanceof Error ? error.message : 'Unexpected connect error');
  }
}
