import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export type EdyRunEventType = 'fechar_caixa' | 'adiantamento' | 'corrida_concluida' | 'despesa_registrada';

export interface EdyRunEvent {
  id?: string;
  uid: string;
  tipo: EdyRunEventType;
  valor: number;
  descricao: string;
  clienteNome?: string;
  data: Timestamp | Date;
  processadoPeloKipo: boolean;
  criadoEm: Timestamp | Date;
}

export function escutarEventosEdyRun(uid: string, onEvento: (eventos: EdyRunEvent[]) => void) {
  const q = query(
    collection(db, 'eventos_financeiros'),
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

  return unsubscribe;
}

export async function marcarEventoProcessado(eventoId: string) {
  await updateDoc(doc(db, 'eventos_financeiros', eventoId), { processadoPeloKipo: true });
}

export function formatarValorBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function mapearCategoriaEdyRun(tipo: EdyRunEventType): string {
  const mapa: Record<EdyRunEventType, string> = {
    fechar_caixa: 'rendas_edyrun',
    adiantamento: 'rendas_edyrun',
    corrida_concluida: 'rendas_edyrun',
    despesa_registrada: 'despesas_edyrun',
  };
  return mapa[tipo];
}