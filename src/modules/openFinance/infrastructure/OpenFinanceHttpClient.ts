import { auth } from '../../../services/firebase/config';
import { OPEN_FINANCE_API_BASE_URL } from './openFinanceApiConfig';

async function buildHeaders() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  const idToken = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  };
}

export class OpenFinanceHttpClient {
  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${OPEN_FINANCE_API_BASE_URL}${path}`, {
      method: 'POST',
      headers: await buildHeaders(),
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((payload as any)?.error ?? 'Falha na comunicação com o backend Open Finance.');
    }

    return payload as T;
  }
}
