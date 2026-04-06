// src/context/FinanceContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from './AuthContext';
import {
  escutarEventosEdyRun,
  marcarEventoProcessado,
  mapearCategoriaEdyRun,
  EdyRunEvent,
} from '../services/edyrun/edyrunIntegration';

export interface Transacao {
  id?: string;
  uid: string;
  tipo: 'receita' | 'despesa';
  valor: number;           // em centavos
  descricao: string;
  categoria: string;
  data: Timestamp | Date;
  origem: 'kipo' | 'edyrun'; // de onde veio a transação
  criadoEm: Timestamp | Date;
}

interface FinanceContextData {
  transacoes: Transacao[];
  saldoDisponivel: number;      // em centavos
  totalReceitas: number;
  totalDespesas: number;
  loading: boolean;
  adicionarTransacao: (t: Omit<Transacao, 'id' | 'uid' | 'criadoEm'>) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextData>({} as FinanceContextData);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  // Escuta transações do Kipo
  useEffect(() => {
    if (!user) return;

    const ref = collection(db, 'transacoes_kipo');
    const q = query(
      ref,
      where('uid', '==', user.uid),
      orderBy('data', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista: Transacao[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Transacao, 'id'>),
      }));
      setTransacoes(lista);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Escuta eventos do EdyRun e converte em transações
  useEffect(() => {
    if (!user) return;

    const unsubscribe = escutarEventosEdyRun(user.uid, async (eventos) => {
      for (const evento of eventos) {
        await processarEventoEdyRun(evento);
      }
    });

    return unsubscribe;
  }, [user]);

  async function processarEventoEdyRun(evento: EdyRunEvent) {
    if (!user || !evento.id) return;

    const tipo = evento.tipo === 'despesa_registrada' ? 'despesa' : 'receita';

    await addDoc(collection(db, 'transacoes_kipo'), {
      uid: user.uid,
      tipo,
      valor: evento.valor,
      descricao: `[EdyRun] ${evento.descricao}`,
      categoria: mapearCategoriaEdyRun(evento.tipo),
      data: evento.data,
      origem: 'edyrun',
      criadoEm: serverTimestamp(),
    });

    await marcarEventoProcessado(evento.id);
  }

  async function adicionarTransacao(t: Omit<Transacao, 'id' | 'uid' | 'criadoEm'>) {
    if (!user) return;
    await addDoc(collection(db, 'transacoes_kipo'), {
      ...t,
      uid: user.uid,
      origem: 'kipo',
      criadoEm: serverTimestamp(),
    });
  }

  const totalReceitas = transacoes
    .filter((t) => t.tipo === 'receita')
    .reduce((acc, t) => acc + t.valor, 0);

  const totalDespesas = transacoes
    .filter((t) => t.tipo === 'despesa')
    .reduce((acc, t) => acc + t.valor, 0);

  const saldoDisponivel = totalReceitas - totalDespesas;

  return (
    <FinanceContext.Provider
      value={{
        transacoes,
        saldoDisponivel,
        totalReceitas,
        totalDespesas,
        loading,
        adicionarTransacao,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  return useContext(FinanceContext);
}
