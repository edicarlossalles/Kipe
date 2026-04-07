// src/screens/Home/components/ListaTransacoes.tsx
// Responsabilidade: exibir transações filtradas por período.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transacao } from '../../../context/FinanceContext';
import { FiltroPeriodo } from '../hooks/useHomeData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  transacoes: Transacao[];
  filtro: FiltroPeriodo;
  onFiltroChange: (f: FiltroPeriodo) => void;
  onVerTodas: () => void;
}

const FILTROS: { key: FiltroPeriodo; label: string }[] = [
  { key: 'hoje',   label: 'Hoje' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mês' },
];

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatData(data: any): string {
  try {
    const d = data?.toDate ? data.toDate() : new Date(data);
    return format(d, "dd MMM, HH'h'mm", { locale: ptBR });
  } catch {
    return '';
  }
}

function ItemTransacao({ t }: { t: Transacao }) {
  const isReceita  = t.tipo === 'receita';
  const isEdyRun   = t.origem === 'edyrun';
  const isOpenFinance = t.origem === 'open_finance';
  const corValor   = isReceita ? '#00D4AA' : '#FF5C5C';
  const corIcon    = isReceita ? '#00D4AA' : '#FF5C5C';
  const fundoIcon  = isReceita ? '#0D2A1F' : '#2A1010';
  const icone      = isReceita ? 'arrow-up' : 'arrow-down';
  const descricao  = t.descricao.replace('[EdyRun] ', '');

  return (
    <View style={[styles.item, isEdyRun && styles.itemEdyRun, isOpenFinance && styles.itemOpenFinance]}>
      <View style={[styles.iconBox, { backgroundColor: fundoIcon }]}>
        <Ionicons name={icone} size={13} color={corIcon} />
      </View>
      <View style={styles.itemInfo}>
        <View style={styles.itemTituloRow}>
          <Text style={styles.itemDesc} numberOfLines={1}>{descricao}</Text>
          {isEdyRun && (
            <View style={styles.badgeEdyRun}>
              <Text style={styles.badgeEdyRunText}>EdyRun</Text>
            </View>
          )}
          {isOpenFinance && (
            <View style={styles.badgeBanco}>
              <Text style={styles.badgeBancoText}>Banco</Text>
            </View>
          )}
        </View>
        <Text style={styles.itemMeta}>
          {t.categoria} • {formatData(t.data)}
        </Text>
      </View>
      <Text style={[styles.itemValor, { color: corValor }]}>
        {isReceita ? '+' : '-'}{formatBRL(t.valor)}
      </Text>
    </View>
  );
}

export default function ListaTransacoes({ transacoes, filtro, onFiltroChange, onVerTodas }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Transações</Text>
        <TouchableOpacity onPress={onVerTodas}>
          <Text style={styles.verTodas}>Ver todas</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={styles.filtros}>
        {FILTROS.map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => onFiltroChange(f.key)}
            style={[styles.filtroBtn, filtro === f.key && styles.filtroBtnAtivo]}
            activeOpacity={0.8}
          >
            {filtro === f.key ? (
              <Text style={styles.filtroTextoAtivo}>{f.label}</Text>
            ) : (
              <Text style={styles.filtroTexto}>{f.label}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      {transacoes.length === 0 ? (
        <View style={styles.vazio}>
          <Ionicons name="receipt-outline" size={32} color="#3A3A5A" />
          <Text style={styles.vazioTexto}>Nenhuma transação nesse período</Text>
        </View>
      ) : (
        <View style={styles.lista}>
          {transacoes.slice(0, 5).map(t => (
            <ItemTransacao key={t.id} t={t} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 36 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titulo: { fontSize: 16, fontWeight: '700', color: '#F0F0FF' },
  verTodas: { fontSize: 12, color: '#6C63FF', fontWeight: '600' },
  filtros: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filtroBtn: {
    backgroundColor: '#141428',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#252545',
  },
  filtroBtnAtivo: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  filtroTexto: { fontSize: 11, color: '#7A7AA2' },
  filtroTextoAtivo: { fontSize: 11, color: '#fff', fontWeight: '700' },
  lista: { gap: 10 },
  item: {
    backgroundColor: '#141428',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252545',
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemEdyRun: { borderColor: '#00D4AA22' },
  itemOpenFinance: { borderColor: '#6C63FF33' },
  iconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  itemInfo: { flex: 1, minWidth: 0 },
  itemTituloRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  itemDesc: { fontSize: 13, fontWeight: '600', color: '#F0F0FF', flex: 1 },
  badgeEdyRun: {
    backgroundColor: '#00D4AA22',
    borderWidth: 1,
    borderColor: '#00D4AA44',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeEdyRunText: { fontSize: 8, color: '#00D4AA' },
  badgeBanco: {
    backgroundColor: '#6C63FF22',
    borderWidth: 1,
    borderColor: '#6C63FF44',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeBancoText: { fontSize: 8, color: '#8B85FF' },
  itemMeta: { fontSize: 11, color: '#7A7AA2' },
  itemValor: { fontSize: 13, fontWeight: '700', flexShrink: 0 },
  vazio: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  vazioTexto: { fontSize: 13, color: '#3A3A5A' },
});
