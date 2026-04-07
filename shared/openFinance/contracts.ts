export const OPEN_FINANCE_COLLECTIONS = {
  connectionRequests: 'open_finance_connection_requests',
  connections: 'open_finance_connections',
  syncJobs: 'open_finance_sync_jobs',
  accounts: 'open_finance_accounts',
  rawTransactions: 'open_finance_transactions_raw',
  webhookEvents: 'open_finance_webhook_events',
  kipoTransactions: 'transacoes_kipo',
} as const;

export type OpenFinanceProvider = 'pluggy';

export type OpenFinanceConnectionStatus =
  | 'pending'
  | 'awaiting_consent'
  | 'connected'
  | 'syncing'
  | 'error'
  | 'disconnect_requested'
  | 'disconnected';

export type OpenFinanceSyncJobStatus = 'pending' | 'running' | 'success' | 'error';

export type OpenFinanceSyncJobTrigger = 'manual' | 'webhook' | 'initial';

export type OpenFinanceTransactionDirection = 'receita' | 'despesa';

export type OpenFinanceTransactionOperation =
  | 'pix'
  | 'ted'
  | 'doc'
  | 'transferencia'
  | 'debito'
  | 'boleto'
  | 'saque'
  | 'deposito'
  | 'tarifa'
  | 'outros';

export interface OpenFinanceInstitutionOption {
  key: string;
  name: string;
  color: string;
  icon: string;
}

export interface OpenFinanceConnection {
  id: string;
  uid: string;
  provider: OpenFinanceProvider;
  institutionKey: string;
  institutionName: string;
  status: OpenFinanceConnectionStatus;
  providerItemId?: string;
  connectorId?: number;
  consentUrl?: string | null;
  consentExpiresAt?: unknown;
  lastSyncAt?: unknown;
  lastSuccessfulSyncAt?: unknown;
  accountsCount?: number;
  transactionCount?: number;
  maskedDocument?: string;
  errorMessage?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OpenFinanceConnectionRequest {
  id: string;
  uid: string;
  provider: OpenFinanceProvider;
  institutionKey: string;
  institutionName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  documentNumber?: string;
  maskedDocument?: string;
  connectionId?: string;
  errorMessage?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OpenFinanceSyncJob {
  id: string;
  uid: string;
  connectionId: string;
  status: OpenFinanceSyncJobStatus;
  trigger: OpenFinanceSyncJobTrigger;
  errorMessage?: string;
  createdAt?: unknown;
  finishedAt?: unknown;
  updatedAt?: unknown;
}

export interface OpenFinanceAccount {
  id: string;
  uid: string;
  connectionId: string;
  provider: OpenFinanceProvider;
  providerAccountId: string;
  providerItemId: string;
  institutionName: string;
  name: string;
  type?: string;
  subtype?: string;
  currencyCode?: string;
  balance?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  syncedAt?: unknown;
}

export interface OpenFinanceRawTransaction {
  id: string;
  uid: string;
  connectionId: string;
  provider: OpenFinanceProvider;
  providerItemId: string;
  providerAccountId: string;
  providerTransactionId: string;
  direction: OpenFinanceTransactionDirection;
  amount: number;
  description: string;
  descriptionRaw?: string;
  operationType?: string | null;
  paymentMethod?: string | null;
  providerCategory?: string | null;
  providerCode?: string | null;
  status?: string;
  date: unknown;
  syncedAt?: unknown;
  payload: Record<string, unknown>;
}

export interface OpenFinanceKipoTransaction {
  uid: string;
  tipo: OpenFinanceTransactionDirection;
  valor: number;
  descricao: string;
  categoria: string;
  data: unknown;
  origem: 'open_finance';
  criadoEm: unknown;
  provider: OpenFinanceProvider;
  providerItemId: string;
  providerAccountId: string;
  providerTransactionId: string;
  institutionName: string;
  modalidade: OpenFinanceTransactionOperation;
  status?: string;
}

export interface OpenFinanceWebhookEvent {
  id: string;
  event: string;
  eventId?: string;
  itemId?: string;
  accountId?: string;
  clientUserId?: string;
  triggeredBy?: string;
  createdTransactionsLink?: string;
  transactionIds?: string[];
  payload: Record<string, unknown>;
  processedAt?: unknown;
  errorMessage?: string;
  createdAt?: unknown;
}

export function maskDocumentNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 4) {
    return digits;
  }

  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function normalizeDocumentNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function buildConnectionDocumentId(requestId: string): string {
  return requestId;
}

export function buildProviderScopedId(parts: Array<string | undefined | null>): string {
  return parts
    .filter(Boolean)
    .join('_')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}
