export interface PluggyItemParameter {
  name: string;
  type: string;
  data?: string;
  expiresAt?: string;
}

export interface PluggyItem {
  id: string;
  status?: string;
  executionStatus?: string;
  clientUserId?: string;
  parameter?: PluggyItemParameter | null;
  updatedAt?: string;
  lastUpdatedAt?: string;
}

export interface PluggyConnectorCredential {
  name: string;
  label?: string;
  validation?: string;
}

export interface PluggyConnector {
  id: number;
  name: string;
  credentials?: PluggyConnectorCredential[];
}

export interface PluggyAccount {
  id: string;
  itemId: string;
  name: string;
  type?: string;
  subtype?: string;
  currencyCode?: string;
  balance?: number;
}

export interface PluggyTransaction {
  id?: string;
  providerId?: string | null;
  accountId: string;
  itemId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  descriptionRaw?: string;
  date: string;
  status?: string;
  operationType?: string | null;
  providerCode?: string | null;
  category?: string | null;
  paymentData?: {
    paymentMethod?: string | null;
  } | null;
}

interface PluggyPagedResponse<T> {
  totalPages?: number;
  results: T[];
}

export class PluggyClient {
  private apiKeyCache: { token: string; expiresAt: number } | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {}

  private async getApiKey() {
    if (this.apiKeyCache && this.apiKeyCache.expiresAt > Date.now()) {
      return this.apiKeyCache.token;
    }

    const response = await fetch(`${this.baseUrl}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Pluggy auth failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { apiKey: string };
    this.apiKeyCache = {
      token: payload.apiKey,
      expiresAt: Date.now() + 1000 * 60 * 110,
    };
    return payload.apiKey;
  }

  private async request<T>(path: string, init?: RequestInit) {
    const apiKey = await this.getApiKey();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Pluggy request failed (${response.status}): ${text}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  getConnector(connectorId: number) {
    return this.request<PluggyConnector>(`/connectors/${connectorId}`);
  }

  createItem(payload: {
    connectorId: number;
    clientUserId: string;
    webhookUrl: string;
    parameters: Record<string, string>;
    products?: string[];
    avoidDuplicates?: boolean;
  }) {
    return this.request<PluggyItem>('/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getItem(itemId: string) {
    return this.request<PluggyItem>(`/items/${itemId}`);
  }

  updateItem(itemId: string, payload?: Record<string, unknown>) {
    return this.request<PluggyItem>(`/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload ?? {}),
    });
  }

  deleteItem(itemId: string) {
    return this.request<void>(`/items/${itemId}`, { method: 'DELETE' });
  }

  listAccounts(itemId: string) {
    return this.request<PluggyPagedResponse<PluggyAccount>>(`/accounts?itemId=${encodeURIComponent(itemId)}`);
  }

  listTransactionsByAccount(accountId: string, page = 1, pageSize = 500) {
    return this.request<PluggyPagedResponse<PluggyTransaction>>(
      `/transactions?accountId=${encodeURIComponent(accountId)}&page=${page}&pageSize=${pageSize}`
    );
  }
}
