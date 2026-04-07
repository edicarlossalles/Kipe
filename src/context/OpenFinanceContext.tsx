import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { OPEN_FINANCE_INSTITUTIONS } from '../modules/openFinance/domain/institutions';
import {
  OpenFinanceConnection,
  OpenFinanceInstitutionOption,
  OpenFinanceSyncJob,
} from '../modules/openFinance/domain/openFinanceTypes';
import { FirestoreOpenFinanceRepository } from '../modules/openFinance/infrastructure/FirestoreOpenFinanceRepository';

interface OpenFinanceContextData {
  institutions: OpenFinanceInstitutionOption[];
  connections: OpenFinanceConnection[];
  syncJobs: OpenFinanceSyncJob[];
  loading: boolean;
  connectInstitution: (institution: OpenFinanceInstitutionOption, documentNumber: string) => Promise<void>;
  syncConnection: (connectionId: string) => Promise<void>;
  disconnectConnection: (connectionId: string) => Promise<void>;
}

const OpenFinanceContext = createContext<OpenFinanceContextData>({} as OpenFinanceContextData);

export function OpenFinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const repository = useMemo(() => new FirestoreOpenFinanceRepository(), []);
  const [connections, setConnections] = useState<OpenFinanceConnection[]>([]);
  const [syncJobs, setSyncJobs] = useState<OpenFinanceSyncJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setConnections([]);
      setSyncJobs([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribeConnections = repository.observeConnections(user.uid, (nextConnections) => {
      setConnections(nextConnections);
      setLoading(false);
    });

    const unsubscribeJobs = repository.observeSyncJobs(user.uid, setSyncJobs);

    return () => {
      unsubscribeConnections();
      unsubscribeJobs();
    };
  }, [repository, user]);

  async function connectInstitution(institution: OpenFinanceInstitutionOption, documentNumber: string) {
    if (!user) {
      throw new Error('Usuário não autenticado.');
    }

    await repository.createConnectionRequest({
      uid: user.uid,
      provider: 'pluggy',
      institution,
      documentNumber,
    });
  }

  async function syncConnection(connectionId: string) {
    if (!user) {
      throw new Error('Usuário não autenticado.');
    }

    await repository.requestSync({
      uid: user.uid,
      connectionId,
    });
  }

  async function disconnectConnection(connectionId: string) {
    await repository.requestDisconnect({ connectionId });
  }

  return (
    <OpenFinanceContext.Provider
      value={{
        institutions: OPEN_FINANCE_INSTITUTIONS,
        connections,
        syncJobs,
        loading,
        connectInstitution,
        syncConnection,
        disconnectConnection,
      }}
    >
      {children}
    </OpenFinanceContext.Provider>
  );
}

export function useOpenFinance() {
  return useContext(OpenFinanceContext);
}
