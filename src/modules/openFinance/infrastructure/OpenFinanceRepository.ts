import { OpenFinanceConnection, OpenFinanceInstitutionOption, OpenFinanceSyncJob } from '../domain/openFinanceTypes';

export interface CreateConnectionRequestInput {
  uid: string;
  provider: 'pluggy';
  institution: OpenFinanceInstitutionOption;
  documentNumber: string;
}

export interface RequestSyncInput {
  uid: string;
  connectionId: string;
  trigger?: 'manual' | 'webhook' | 'initial';
}

export interface RequestDisconnectInput {
  connectionId: string;
}

export interface OpenFinanceRepository {
  observeConnections: (uid: string, onChange: (connections: OpenFinanceConnection[]) => void) => () => void;
  observeSyncJobs: (uid: string, onChange: (jobs: OpenFinanceSyncJob[]) => void) => () => void;
  createConnectionRequest: (input: CreateConnectionRequestInput) => Promise<void>;
  requestSync: (input: RequestSyncInput) => Promise<void>;
  requestDisconnect: (input: RequestDisconnectInput) => Promise<void>;
}
