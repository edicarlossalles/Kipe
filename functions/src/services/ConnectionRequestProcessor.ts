import { logger } from 'firebase-functions';
import { maskDocumentNumber, normalizeDocumentNumber } from '../../../shared/openFinance/contracts';
import { resolveConnectorId } from '../domain/institutions';
import { mapPluggyStatus, resolveDocumentParameterName } from '../domain/pluggyMappers';
import { PluggyClient } from '../pluggy/PluggyClient';
import { OpenFinanceStore } from '../repositories/OpenFinanceStore';

export class ConnectionRequestProcessor {
  constructor(
    private readonly store: OpenFinanceStore,
    private readonly pluggyClient: PluggyClient,
    private readonly connectorIds: Record<string, number>,
    private readonly webhookUrl: string
  ) {}

  async process(requestId: string, payload: Record<string, unknown>) {
    const uid = String(payload.uid ?? '');
    const provider = 'pluggy' as const;
    const institutionKey = String(payload.institutionKey ?? '');
    const institutionName = String(payload.institutionName ?? '');
    const documentNumber = normalizeDocumentNumber(String(payload.documentNumber ?? ''));

    if (!uid || !institutionKey || !institutionName || !documentNumber) {
      throw new Error('Connection request is missing required fields.');
    }

    const maskedDocument = maskDocumentNumber(documentNumber);
    const connectionId = await this.store.ensureConnectionShell({
      requestId,
      uid,
      provider,
      institutionKey,
      institutionName,
      maskedDocument,
    });

    await this.store.markRequestProcessing(requestId, connectionId, maskedDocument);

    try {
      const connectorId = resolveConnectorId(institutionKey, this.connectorIds);
      const connector = await this.pluggyClient.getConnector(connectorId);
      const documentParameterName = resolveDocumentParameterName(connector.credentials);
      const item = await this.pluggyClient.createItem({
        connectorId,
        clientUserId: uid,
        webhookUrl: this.webhookUrl,
        avoidDuplicates: true,
        products: ['ACCOUNTS', 'TRANSACTIONS'],
        parameters: {
          [documentParameterName]: documentNumber,
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

      await this.store.completeRequest(requestId);
      logger.info('Open Finance connection request processed.', { requestId, connectionId, itemId: item.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown connection request error';
      await this.store.updateConnection(connectionId, {
        status: 'error',
        errorMessage: message,
      });
      await this.store.failRequest(requestId, message);
      throw error;
    }
  }
}
