// src/services/edyrun/edyrunIntegration.ts
//
// Este serviço escuta a coleção "eventos_financeiros" no Firestore.
// Quando o EdyRun fechar caixa ou registrar um adiantamento,
// ele grava um documento nessa coleção — o Kipo lê em tempo real.

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export type EdyRunEventType =
  | 'fechar_caixa'        // cliente pagou — dá baixa no saldo em aberto
  | 'adiantamento'        // cliente pagou adiantado
  | 'corrida_concluida'   // nova corrida registrada (para cálculo de renda)
  | 'despesa_registrada'; // despesa lançada no EdyRun (ex: gasolina)

export interface EdyRunEvent {
  id?: string;
  uid: string;                    // uid do usuário Firebase (mesmo nos dois apps)
  tipo: EdyRunEventType;
  valor: number;                  // em centavos para evitar float
  descricao: string;
  clienteNome?: string;
  data: Timestamp | Date;
  processadoPeloKipo: boolean;    // o Kipo marca como true após processar
  criadoEm: Timestamp | Date;
}

// Escuta eventos do EdyRun em tempo real
// Chame essa função na inicialização do app e guarde o unsubscribe
export function escutarEventosEdyRun(
  uid: string,
  onEvento: (eventos: EdyRunEvent[]) => void
) {
  const ref = collection(db, 'eventos_financeiros');
  const q = query(
    ref,
    where('uid', '==', uid),
    where('processadoPeloKipo', '==', false),
    orderBy('criadoEm', 'desc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const eventos: EdyRunEvent[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<EdyRunEvent, 'id'>),
    }));
    onEvento(eventos);
  });

  return unsubscribe; // chame para parar de escutar
}

// Marcar evento como processado pelo Kipo
export async function marcarEventoProcessado(eventoId: string) {
  const { updateDoc, doc } = await import('firebase/firestore');
  const ref = doc(db, 'eventos_financeiros', eventoId);
  await updateDoc(ref, { processadoPeloKipo: true });
}

// Converter valor em centavos para BRL formatado
export function formatarValorBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// Mapear tipo do evento EdyRun para categoria no Kipo
export function mapearCategoriaEdyRun(tipo: EdyRunEventType): string {
  const mapa: Record<EdyRunEventType, string> = {
    fechar_caixa: 'rendas_edyrun',
    adiantamento: 'rendas_edyrun',
    corrida_concluida: 'rendas_edyrun',
    despesa_registrada: 'despesas_edyrun',
  };
  return mapa[tipo];
}
