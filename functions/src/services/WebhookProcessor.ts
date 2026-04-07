import { logger } from 'firebase-functions';
import { mapPluggyStatus } from '../domain/pluggyMappers';
import { PluggyClient } from '../pluggy/PluggyClient';
import { OpenFinanceStore } from '../repositories/OpenFinanceStore';

export class WebhookProcessor {
  constructor(
    private readonly store: OpenFinanceStore,
    private readonly pluggyClient: PluggyClient
  ) {}

  async process(eventId: string, payload: Record<string, unknown>) {
    const eventName = String(payload.event ?? '');
    const itemId = payload.itemId ? String(payload.itemId) : undefined;

    if (!eventName) {
      throw new Error('Webhook event is missing event name.');
    }

    if (eventName === 'connector/status_updated') {
      await this.store.markWebhookProcessed(eventId);
      return;
    }

    if (!itemId && !eventName.startsWith('connector/')) {
      throw new Error('Webhook event is missing item id.');
    }

    const connection = itemId ? await this.store.findConnectionByItemId(itemId) : null;
    if (!connection && itemId) {
      logger.warn('Webhook arrived for unknown connection.', { eventId, itemId, eventName });
      await this.store.markWebhookProcessed(eventId);
      return;
    }

    switch (eventName) {
      case 'item/created':
      case 'item/updated':
      case 'item/login_succeeded': {
        const item = await this.pluggyClient.getItem(itemId!);
        await this.store.updateConnection(connection!.id, {
          status: mapPluggyStatus(item),
          errorMessage: null,
          consentUrl: item.parameter?.type === 'oauth' ? item.parameter.data ?? null : null,
          consentExpiresAt: item.parameter?.expiresAt ?? null,
          lastSyncAt: item.lastUpdatedAt ?? item.updatedAt ?? null,
        });
        await this.store.createSyncJob({
          uid: connection!.uid,
          connectionId: connection!.id,
          trigger: eventName === 'item/created' ? 'initial' : 'webhook',
        });
        break;
      }
      case 'item/error':
      case 'item/waiting_user_input': {
        const item = await this.pluggyClient.getItem(itemId!);
        await this.store.updateConnection(connection!.id, {
          status: mapPluggyStatus(item),
          errorMessage: item.executionStatus ?? 'Pluggy returned an item error.',
          consentUrl: item.parameter?.type === 'oauth' ? item.parameter.data ?? null : null,
          consentExpiresAt: item.parameter?.expiresAt ?? null,
        });
        break;
      }
      case 'item/deleted': {
        await this.store.markConnectionDisconnected(connection!.id);
        break;
      }
      case 'transactions/created':
      case 'transactions/updated': {
        await this.store.createSyncJob({
          uid: connection!.uid,
          connectionId: connection!.id,
          trigger: 'webhook',
        });
        break;
      }
      case 'transactions/deleted': {
        const transactionIds = Array.isArray(payload.transactionIds)
          ? payload.transactionIds.map((entry) => String(entry))
          : [];
        await this.store.deleteTransactionsByProviderIds(connection!.uid, itemId!, transactionIds);
        break;
      }
      default:
        logger.info('Webhook event received with no-op handler.', { eventName, itemId });
    }

    await this.store.markWebhookProcessed(eventId);
  }
}
