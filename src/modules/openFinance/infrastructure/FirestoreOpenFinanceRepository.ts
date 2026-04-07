import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../../services/firebase/config';
import { OPEN_FINANCE_COLLECTIONS, OpenFinanceConnection, OpenFinanceSyncJob } from '../domain/openFinanceTypes';
import { OpenFinanceHttpClient } from './OpenFinanceHttpClient';
import {
  CreateConnectionRequestInput,
  OpenFinanceRepository,
  RequestDisconnectInput,
  RequestSyncInput,
} from './OpenFinanceRepository';

function mapConnection(snapshotDoc: any): OpenFinanceConnection {
  return {
    id: snapshotDoc.id,
    ...(snapshotDoc.data() as Omit<OpenFinanceConnection, 'id'>),
  };
}

function mapSyncJob(snapshotDoc: any): OpenFinanceSyncJob {
  return {
    id: snapshotDoc.id,
    ...(snapshotDoc.data() as Omit<OpenFinanceSyncJob, 'id'>),
  };
}

export class FirestoreOpenFinanceRepository implements OpenFinanceRepository {
  private readonly httpClient = new OpenFinanceHttpClient();

  observeConnections(uid: string, onChange: (connections: OpenFinanceConnection[]) => void) {
    const connectionsQuery = query(
      collection(db, OPEN_FINANCE_COLLECTIONS.connections),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(connectionsQuery, (snapshot) => {
      onChange(snapshot.docs.map(mapConnection));
    });
  }

  observeSyncJobs(uid: string, onChange: (jobs: OpenFinanceSyncJob[]) => void) {
    const syncJobsQuery = query(
      collection(db, OPEN_FINANCE_COLLECTIONS.syncJobs),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(syncJobsQuery, (snapshot) => {
      onChange(snapshot.docs.map(mapSyncJob));
    });
  }

  async createConnectionRequest(input: CreateConnectionRequestInput) {
    await this.httpClient.post('/connect', {
      institutionKey: input.institution.key,
      institutionName: input.institution.name,
      documentNumber: input.documentNumber,
    });
  }

  async requestSync(input: RequestSyncInput) {
    await this.httpClient.post('/sync', {
      connectionId: input.connectionId,
    });
  }

  async requestDisconnect(input: RequestDisconnectInput) {
    await this.httpClient.post('/disconnect', {
      connectionId: input.connectionId,
    });
  }
}
