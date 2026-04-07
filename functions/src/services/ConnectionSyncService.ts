import { logger } from 'firebase-functions';
import { buildAccountId, mapAccountRecord, mapPluggyStatus, mapTransactions } from '../domain/pluggyMappers';
import { PluggyClient } from '../pluggy/PluggyClient';
import { OpenFinanceStore } from '../repositories/OpenFinanceStore';

export class ConnectionSyncService {
  constructor(
    private readonly store: OpenFinanceStore,
    private readonly pluggyClient: PluggyClient
  ) {}

  async run(jobId: string, payload: Record<string, unknown>) {
    const uid = String(payload.uid ?? '');
    const connectionId = String(payload.connectionId ?? '');

    if (!uid || !connectionId) {
      throw new Error('Sync job is missing required fields.');
    }

    const connection = await this.store.getConnection(connectionId);
    if (!connection?.providerItemId) {
      throw new Error(`Connection ${connectionId} does not have a provider item id.`);
    }

    await this.store.updateSyncJob(jobId, {
      status: 'running',
      errorMessage: null,
    });
    await this.store.updateConnection(connectionId, {
      status: 'syncing',
      errorMessage: null,
    });

    try {
      const item = await this.pluggyClient.updateItem(connection.providerItemId);
      const accountsResponse = await this.pluggyClient.listAccounts(connection.providerItemId);

      const accountRecords = accountsResponse.results.map((account) => ({
        id: buildAccountId(uid, connection.providerItemId!, account.id),
        data: mapAccountRecord({
          uid,
          connectionId,
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
            uid,
            connectionId,
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
      await this.store.updateConnection(connectionId, {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      await this.store.updateConnection(connectionId, {
        status: 'error',
        errorMessage: message,
      });
      await this.store.updateSyncJob(jobId, {
        status: 'error',
        errorMessage: message,
        finishedAt: new Date().toISOString(),
      });
      logger.error('Open Finance sync failed.', { connectionId, jobId, error: message });
      throw error;
    }
  }
}
