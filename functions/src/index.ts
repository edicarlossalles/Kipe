import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { OPEN_FINANCE_COLLECTIONS } from '../../shared/openFinance/contracts';
import { getPluggyEnvironment } from './config/environment';
import { PluggyClient } from './pluggy/PluggyClient';
import { OpenFinanceStore } from './repositories/OpenFinanceStore';
import { ConnectionRequestProcessor } from './services/ConnectionRequestProcessor';
import { ConnectionSyncService } from './services/ConnectionSyncService';
import { WebhookProcessor } from './services/WebhookProcessor';

initializeApp();

const firestore = getFirestore();
const environment = getPluggyEnvironment();
const store = new OpenFinanceStore(firestore);
const pluggyClient = new PluggyClient(environment.baseUrl, environment.clientId, environment.clientSecret);
const syncService = new ConnectionSyncService(store, pluggyClient);
const webhookProcessor = new WebhookProcessor(store, pluggyClient);

function resolveWebhookUrl() {
  if (process.env.OPEN_FINANCE_WEBHOOK_URL) {
    return process.env.OPEN_FINANCE_WEBHOOK_URL;
  }

  const projectId = process.env.GCLOUD_PROJECT ?? process.env.PROJECT_ID;
  if (!projectId) {
    throw new Error('Unable to resolve webhook URL. Set OPEN_FINANCE_WEBHOOK_URL.');
  }

  return `https://us-central1-${projectId}.cloudfunctions.net/pluggyWebhook`;
}

export const onOpenFinanceConnectionRequestCreated = onDocumentCreated(
  `${OPEN_FINANCE_COLLECTIONS.connectionRequests}/{requestId}`,
  async (event) => {
    if (!event.data) return;

    const data = event.data.data();
    if (data.status !== 'pending') {
      return;
    }

    try {
      const processor = new ConnectionRequestProcessor(
        store,
        pluggyClient,
        environment.connectorIds,
        resolveWebhookUrl()
      );
      await processor.process(event.params.requestId, data);
    } catch (error) {
      logger.error('Failed to process connection request.', { requestId: event.params.requestId, error });
      throw error;
    }
  }
);

export const onOpenFinanceSyncJobCreated = onDocumentCreated(
  `${OPEN_FINANCE_COLLECTIONS.syncJobs}/{jobId}`,
  async (event) => {
    if (!event.data) return;

    const data = event.data.data();
    if (data.status !== 'pending') {
      return;
    }

    await syncService.run(event.params.jobId, data);
  }
);

export const onOpenFinanceDisconnectRequested = onDocumentUpdated(
  `${OPEN_FINANCE_COLLECTIONS.connections}/{connectionId}`,
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status === after.status || after.status !== 'disconnect_requested') {
      return;
    }

    const providerItemId = String(after.providerItemId ?? '');
    if (!providerItemId) {
      await store.markConnectionDisconnected(event.params.connectionId);
      return;
    }

    await pluggyClient.deleteItem(providerItemId);
    await store.markConnectionDisconnected(event.params.connectionId);
  }
);

export const pluggyWebhook = onRequest(async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).send('Method Not Allowed');
    return;
  }

  if (environment.webhookSecret) {
    const incomingSecret = request.get('authorization') ?? request.get('x-webhook-secret');
    if (incomingSecret !== environment.webhookSecret) {
      response.status(401).send('Unauthorized');
      return;
    }
  }

  const payload = (request.body ?? {}) as Record<string, unknown>;
  const eventId = String(payload.eventId ?? payload.id ?? `${Date.now()}`);

  await store.appendWebhookEvent(eventId, payload);
  response.status(202).json({ accepted: true, eventId });
});

export const onOpenFinanceWebhookCreated = onDocumentCreated(
  `${OPEN_FINANCE_COLLECTIONS.webhookEvents}/{eventId}`,
  async (event) => {
    if (!event.data) return;

    const data = event.data.data();
    try {
      await webhookProcessor.process(event.params.eventId, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown webhook error';
      await store.markWebhookErrored(event.params.eventId, message);
      throw error;
    }
  }
);
