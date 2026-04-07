import crypto from 'node:crypto';
import { maskDocumentNumber, normalizeDocumentNumber } from '../../../shared/openFinance/contracts.js';
import { getEnvironment } from '../config/environment.js';
import { buildAccountId, mapAccountRecord, mapPluggyStatus, mapTransactions, resolveDocumentParameterName } from '../domain/pluggyMappers.js';
import { PluggyClient } from '../pluggy/PluggyClient.js';
import { OpenFinanceStore } from '../repositories/OpenFinanceStore.js';

export class OpenFinanceService {
  private readonly environment = getEnvironment();
  private readonly pluggyClient = new PluggyClient(
    this.environment.pluggyBaseUrl,
    this.environment.pluggyClientId,
    this.environment.pluggyClientSecret
  );

  constructor(private readonly store: OpenFinanceStore) {}

  private getWebhookUrl() {
    return `${this.environment.openFinancePublicBaseUrl}/api/open-finance/webhook`;
  }

  async createConnection(params: { uid: string; institutionKey: string; institutionName: string; documentNumber: string; }) {
    const connectorId = this.environment.connectorIds[params.institutionKey];
    if (!connectorId) {
      throw new Error(`Connector não configurado para ${params.institutionName}.`);
    }

    const requestId = crypto.randomUUID();
    const normalizedDocument = normalizeDocumentNumber(params.documentNumber);
    const maskedDocument = maskDocumentNumber(normalizedDocument);
    const connectionId = await this.store.createConnectionShell({
      requestId,
      uid: params.uid,
      institutionKey: params.institutionKey,
      institutionName: params.institutionName,
      maskedDocument,
    });

    const connector = await this.pluggyClient.getConnector(connectorId);
    const documentParameterName = resolveDocumentParameterName(connector.credentials);
    const item = await this.pluggyClient.createItem({
      connectorId,
      clientUserId: params.uid,
      webhookUrl: this.getWebhookUrl(),
      avoidDuplicates: true,
      products: ['ACCOUNTS', 'TRANSACTIONS'],
      parameters: {
        [documentParameterName]: normalizedDocument,
      },
    });

    await this.store.updateConnection(connectionId, {
      connectorId,
      providerItemId: item.id,
      consentUrl: item.parameter?.type === 'oauth' ? item.parameter.data ?? null : null,
      consentExpiresAt: item.parameter?.expiresAt ?? null,
      status: mapPluggyStatus(item),
      errorMessage: null,
    });

    return this.store.getConnection(connectionId);
  }

  async syncConnection(params: { uid: string; connectionId: string; trigger: 'manual' | 'webhook' | 'initial'; }) {
    const connection = await this.store.getConnection(params.connectionId);
    if (!connection || connection.uid !== params.uid) {
      throw new Error('Conexão não encontrada.');
    }
    if (!connection.providerItemId) {
      throw new Error('Conexão sem providerItemId.');
    }

    const jobId = await this.store.createSyncJob(params);
    await this.store.updateSyncJob(jobId, { status: 'running', errorMessage: null });
    await this.store.updateConnection(connection.id, { status: 'syncing', errorMessage: null });

    try {
      const item = await this.pluggyClient.updateItem(connection.providerItemId);
      const accountsResponse = await this.pluggyClient.listAccounts(connection.providerItemId);

      const accountRecords = accountsResponse.results.map((account) => ({
        id: buildAccountId(params.uid, connection.providerItemId!, account.id),
        data: mapAccountRecord({
          uid: params.uid,
          connectionId: connection.id,
          institutionName: connection.institutionName,
          providerItemId: connection.providerItemId!,
          account,
        }),
      }));

      const rawTransactions: Array<{ id: string; data: Record<string, unknown> }> = [];
      const kipoTransactions: Array<{ id: string; data: Record<string, unknown> }> = [];

      for (const account of accountsResponse.results) {
        let page = 1;
        let totalPages = 1;
        do {
          const transactionsResponse = await this.pluggyClient.listTransactionsByAccount(account.id, page, 500);
          const mappedTransactions = mapTransactions({
            uid: params.uid,
            connectionId: connection.id,
            institutionName: connection.institutionName,
            providerItemId: connection.providerItemId!,
            providerAccountId: account.id,
            transactions: transactionsResponse.results,
          });

          rawTransactions.push(...mappedTransactions.map((entry) => ({ id: entry.rawId, data: entry.raw as Record<string, unknown> })));
          kipoTransactions.push(...mappedTransactions.map((entry) => ({ id: entry.kipoId, data: entry.kipo as unknown as Record<string, unknown> })));

          totalPages = transactionsResponse.totalPages ?? 1;
          page += 1;
        } while (page <= totalPages);
      }

      await this.store.saveAccountsAndTransactions({
        accounts: accountRecords,
        rawTransactions,
        kipoTransactions,
      });

      const nextStatus = mapPluggyStatus(item);
      await this.store.updateConnection(connection.id, {
        status: nextStatus === 'awaiting_consent' ? 'connected' : nextStatus,
        consentUrl: item.parameter?.type === 'oauth' ? item.parameter.data ?? null : null,
        consentExpiresAt: item.parameter?.expiresAt ?? null,
        lastSyncAt: item.lastUpdatedAt ?? item.updatedAt ?? new Date().toISOString(),
        lastSuccessfulSyncAt: new Date().toISOString(),
        accountsCount: accountsResponse.results.length,
        transactionCount: kipoTransactions.length,
      });

      await this.store.updateSyncJob(jobId, {
        status: 'success',
        finishedAt: new Date().toISOString(),
      });

      return { jobId, connectionId: connection.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      await this.store.updateConnection(connection.id, { status: 'error', errorMessage: message });
      await this.store.updateSyncJob(jobId, { status: 'error', errorMessage: message, finishedAt: new Date().toISOString() });
      throw error;
    }
  }

  async disconnectConnection(params: { uid: string; connectionId: string; }) {
    const connection = await this.store.getConnection(params.connectionId);
    if (!connection || connection.uid !== params.uid) {
      throw new Error('Conexão não encontrada.');
    }

    if (connection.providerItemId) {
      await this.pluggyClient.deleteItem(connection.providerItemId);
    }

    await this.store.markConnectionDisconnected(connection.id);
    return { success: true };
  }

  async processWebhook(payload: Record<string, unknown>) {
    const eventId = String(payload.eventId ?? payload.id ?? crypto.randomUUID());
    await this.store.appendWebhookEvent(eventId, payload);

    const eventName = String(payload.event ?? '');
    const itemId = payload.itemId ? String(payload.itemId) : undefined;
    if (!eventName) {
      throw new Error('Webhook sem event.');
    }

    const connection = itemId ? await this.store.findConnectionByItemId(itemId) : null;
    if (connection && (eventName === 'item/created' || eventName === 'item/updated' || eventName === 'item/login_succeeded')) {
      const item = await this.pluggyClient.getItem(itemId!);
      await this.store.updateConnection(connection.id, {
        status: mapPluggyStatus(item),
        errorMessage: null,
        consentUrl: item.parameter?.type === 'oauth' ? item.parameter.data ?? null : null,
        consentExpiresAt: item.parameter?.expiresAt ?? null,
        lastSyncAt: item.lastUpdatedAt ?? item.updatedAt ?? null,
      });
      await this.syncConnection({ uid: connection.uid, connectionId: connection.id, trigger: eventName === 'item/created' ? 'initial' : 'webhook' });
    } else if (connection && (eventName === 'transactions/created' || eventName === 'transactions/updated')) {
      await this.syncConnection({ uid: connection.uid, connectionId: connection.id, trigger: 'webhook' });
    } else if (connection && eventName === 'transactions/deleted') {
      const transactionIds = Array.isArray(payload.transactionIds) ? payload.transactionIds.map((entry) => String(entry)) : [];
      await this.store.deleteTransactionsByProviderIds(connection.uid, itemId!, transactionIds);
    } else if (connection && eventName === 'item/deleted') {
      await this.store.markConnectionDisconnected(connection.id);
    }

    await this.store.markWebhookProcessed(eventId);
    return { accepted: true, eventId };
  }
}
