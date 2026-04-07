import { Timestamp } from 'firebase-admin/firestore';
import {
  OpenFinanceConnection,
  OpenFinanceKipoTransaction,
  OpenFinanceRawTransaction,
  buildProviderScopedId,
} from '../../../shared/openFinance/contracts';
import { PluggyAccount, PluggyItem, PluggyTransaction } from '../pluggy/PluggyClient';

export function mapPluggyStatus(item: PluggyItem): OpenFinanceConnection['status'] {
  if (item.parameter?.type === 'oauth' && item.parameter?.data) {
    return 'awaiting_consent';
  }

  switch (item.status) {
    case 'UPDATED':
      return 'connected';
    case 'UPDATING':
      return 'syncing';
    case 'WAITING_USER_INPUT':
      return 'awaiting_consent';
    case 'LOGIN_ERROR':
    case 'OUTDATED':
      return 'error';
    default:
      return 'pending';
  }
}

export function resolveDocumentParameterName(credentials: Array<{ name: string; label?: string; validation?: string }> = []): string {
  const candidate = credentials.find((credential) => {
    const haystack = `${credential.name} ${credential.label ?? ''} ${credential.validation ?? ''}`.toLowerCase();
    return haystack.includes('cpf') || haystack.includes('cnpj') || haystack.includes('document');
  });

  return candidate?.name ?? credentials[0]?.name ?? 'documentNumber';
}

export function mapOperationType(operationType?: string | null, paymentMethod?: string | null): OpenFinanceKipoTransaction['modalidade'] {
  const normalized = (paymentMethod ?? operationType ?? '').toLowerCase();

  if (normalized.includes('pix')) return 'pix';
  if (normalized.includes('ted')) return 'ted';
  if (normalized.includes('doc')) return 'doc';
  if (normalized.includes('boleto')) return 'boleto';
  if (normalized.includes('deposit')) return 'deposito';
  if (normalized.includes('saque')) return 'saque';
  if (normalized.includes('cart') || normalized.includes('debit')) return 'debito';
  if (normalized.includes('tarifa') || normalized.includes('fee')) return 'tarifa';
  if (normalized.includes('transfer')) return 'transferencia';
  return 'outros';
}

export function buildRawTransactionId(uid: string, providerItemId: string, providerTransactionId: string) {
  return buildProviderScopedId(['pluggy', uid, providerItemId, providerTransactionId]);
}

export function buildKipoTransactionId(uid: string, providerItemId: string, providerTransactionId: string) {
  return buildProviderScopedId(['open_finance', uid, providerItemId, providerTransactionId]);
}

export function buildAccountId(uid: string, providerItemId: string, providerAccountId: string) {
  return buildProviderScopedId(['pluggy', uid, providerItemId, providerAccountId]);
}

export function mapAccountRecord(params: {
  uid: string;
  connectionId: string;
  institutionName: string;
  providerItemId: string;
  account: PluggyAccount;
}) {
  return {
    uid: params.uid,
    connectionId: params.connectionId,
    provider: 'pluggy' as const,
    providerAccountId: params.account.id,
    providerItemId: params.providerItemId,
    institutionName: params.institutionName,
    name: params.account.name,
    type: params.account.type ?? null,
    subtype: params.account.subtype ?? null,
    currencyCode: params.account.currencyCode ?? 'BRL',
    balance: params.account.balance ?? 0,
    syncedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

export function mapTransactions(params: {
  uid: string;
  connectionId: string;
  institutionName: string;
  providerItemId: string;
  providerAccountId: string;
  transactions: PluggyTransaction[];
}): Array<{ rawId: string; raw: Omit<OpenFinanceRawTransaction, 'id'>; kipoId: string; kipo: OpenFinanceKipoTransaction }> {
  return params.transactions.map((transaction) => {
    const providerTransactionId = transaction.providerId ?? transaction.id ?? buildProviderScopedId([
      transaction.accountId,
      transaction.date,
      transaction.description,
      String(transaction.amount),
    ]);
    const direction = transaction.type === 'CREDIT' ? 'receita' : 'despesa';
    const rawId = buildRawTransactionId(params.uid, params.providerItemId, providerTransactionId);
    const kipoId = buildKipoTransactionId(params.uid, params.providerItemId, providerTransactionId);
    const modalidade = mapOperationType(transaction.operationType, transaction.paymentData?.paymentMethod);

    return {
      rawId,
      raw: {
        uid: params.uid,
        connectionId: params.connectionId,
        provider: 'pluggy',
        providerItemId: params.providerItemId,
        providerAccountId: params.providerAccountId,
        providerTransactionId,
        direction,
        amount: Math.abs(transaction.amount),
        description: transaction.description,
        descriptionRaw: transaction.descriptionRaw ?? undefined,
        operationType: transaction.operationType ?? undefined,
        paymentMethod: transaction.paymentData?.paymentMethod ?? undefined,
        providerCategory: transaction.category ?? undefined,
        providerCode: transaction.providerCode ?? undefined,
        status: transaction.status ?? 'POSTED',
        date: Timestamp.fromDate(new Date(transaction.date)),
        syncedAt: Timestamp.now(),
        payload: transaction as unknown as Record<string, unknown>,
      },
      kipoId,
      kipo: {
        uid: params.uid,
        tipo: direction,
        valor: Math.abs(transaction.amount),
        descricao: `[Banco] ${transaction.description}`,
        categoria: direction === 'receita' ? 'rendas_bancos' : 'despesas_bancos',
        data: Timestamp.fromDate(new Date(transaction.date)),
        origem: 'open_finance',
        criadoEm: Timestamp.now(),
        provider: 'pluggy',
        providerItemId: params.providerItemId,
        providerAccountId: params.providerAccountId,
        providerTransactionId,
        institutionName: params.institutionName,
        modalidade,
        status: transaction.status ?? 'POSTED',
      },
    };
  });
}
