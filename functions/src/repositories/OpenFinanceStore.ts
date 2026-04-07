import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import {
  OPEN_FINANCE_COLLECTIONS,
  OpenFinanceConnection,
  buildConnectionDocumentId,
  buildProviderScopedId,
} from '../../../shared/openFinance/contracts';

export class OpenFinanceStore {
  constructor(private readonly firestore: Firestore) {}

  private connectionRequestRef(id: string) {
    return this.firestore.collection(OPEN_FINANCE_COLLECTIONS.connectionRequests).doc(id);
  }

  private connectionRef(id: string) {
    return this.firestore.collection(OPEN_FINANCE_COLLECTIONS.connections).doc(id);
  }

  private syncJobRef(id: string) {
    return this.firestore.collection(OPEN_FINANCE_COLLECTIONS.syncJobs).doc(id);
  }

  private webhookEventRef(id: string) {
    return this.firestore.collection(OPEN_FINANCE_COLLECTIONS.webhookEvents).doc(id);
  }

  async ensureConnectionShell(params: {
    requestId: string;
    uid: string;
    provider: 'pluggy';
    institutionKey: string;
    institutionName: string;
    maskedDocument: string;
  }) {
    const connectionId = buildConnectionDocumentId(params.requestId);
    await this.connectionRef(connectionId).set(
      {
        uid: params.uid,
        provider: params.provider,
        institutionKey: params.institutionKey,
        institutionName: params.institutionName,
        maskedDocument: params.maskedDocument,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return connectionId;
  }

  async markRequestProcessing(requestId: string, connectionId: string, maskedDocument: string) {
    await this.connectionRequestRef(requestId).set(
      {
        status: 'processing',
        connectionId,
        maskedDocument,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  async completeRequest(requestId: string) {
    await this.connectionRequestRef(requestId).set(
      {
        status: 'completed',
        documentNumber: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  async failRequest(requestId: string, errorMessage: string) {
    await this.connectionRequestRef(requestId).set(
      {
        status: 'error',
        documentNumber: FieldValue.delete(),
        errorMessage,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  async updateConnection(connectionId: string, payload: Record<string, unknown>) {
    await this.connectionRef(connectionId).set(
      {
        ...payload,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  async getConnection(connectionId: string) {
    const snapshot = await this.connectionRef(connectionId).get();
    return snapshot.exists ? ({ id: snapshot.id, ...(snapshot.data() as Omit<OpenFinanceConnection, 'id'>) } as OpenFinanceConnection) : null;
  }

  async findConnectionByItemId(itemId: string) {
    const snapshot = await this.firestore
      .collection(OPEN_FINANCE_COLLECTIONS.connections)
      .where('providerItemId', '==', itemId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...(doc.data() as Omit<OpenFinanceConnection, 'id'>) } as OpenFinanceConnection;
  }

  async createSyncJob(params: {
    uid: string;
    connectionId: string;
    trigger: 'manual' | 'webhook' | 'initial';
    status?: 'pending' | 'running' | 'success' | 'error';
  }) {
    await this.firestore.collection(OPEN_FINANCE_COLLECTIONS.syncJobs).add({
      uid: params.uid,
      connectionId: params.connectionId,
      trigger: params.trigger,
      status: params.status ?? 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async updateSyncJob(id: string, payload: Record<string, unknown>) {
    await this.syncJobRef(id).set(
      {
        ...payload,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  async saveAccountsAndTransactions(params: {
    accounts: Array<{ id: string; data: Record<string, unknown> }>;
    rawTransactions: Array<{ id: string; data: Record<string, unknown> }>;
    kipoTransactions: Array<{ id: string; data: Record<string, unknown> }>;
  }) {
    let batch = this.firestore.batch();
    let writes = 0;

    const flush = async () => {
      if (writes === 0) return;
      await batch.commit();
      batch = this.firestore.batch();
      writes = 0;
    };

    const queueSet = async (collectionName: string, id: string, data: Record<string, unknown>) => {
      batch.set(this.firestore.collection(collectionName).doc(id), data, { merge: true });
      writes += 1;
      if (writes >= 400) {
        await flush();
      }
    };

    for (const account of params.accounts) {
      await queueSet(OPEN_FINANCE_COLLECTIONS.accounts, account.id, account.data);
    }
    for (const raw of params.rawTransactions) {
      await queueSet(OPEN_FINANCE_COLLECTIONS.rawTransactions, raw.id, raw.data);
    }
    for (const kipo of params.kipoTransactions) {
      await queueSet(OPEN_FINANCE_COLLECTIONS.kipoTransactions, kipo.id, kipo.data);
    }

    await flush();
  }

  async deleteTransactionsByProviderIds(uid: string, providerItemId: string, providerTransactionIds: string[]) {
    if (providerTransactionIds.length === 0) {
      return;
    }

    const batch = this.firestore.batch();
    for (const providerTransactionId of providerTransactionIds) {
      const rawId = buildProviderScopedId(['pluggy', uid, providerItemId, providerTransactionId]);
      const kipoId = buildProviderScopedId(['open_finance', uid, providerItemId, providerTransactionId]);
      batch.delete(this.firestore.collection(OPEN_FINANCE_COLLECTIONS.rawTransactions).doc(rawId));
      batch.delete(this.firestore.collection(OPEN_FINANCE_COLLECTIONS.kipoTransactions).doc(kipoId));
    }
    await batch.commit();
  }

  async markConnectionDisconnected(connectionId: string) {
    await this.connectionRef(connectionId).set(
      {
        status: 'disconnected',
        consentUrl: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  async appendWebhookEvent(eventId: string, payload: Record<string, unknown>) {
    await this.webhookEventRef(eventId).set({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async markWebhookProcessed(eventId: string) {
    await this.webhookEventRef(eventId).set(
      {
        processedAt: Timestamp.now(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  async markWebhookErrored(eventId: string, errorMessage: string) {
    await this.webhookEventRef(eventId).set(
      {
        errorMessage,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
}
