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
  const corValor   = isReceita ? '#00D4AA' : '#FF5C5C';
  const corIcon    = isReceita ? '#00D4AA' : '#FF5C5C';
  const fundoIcon  = isReceita ? '#0D2A1F' : '#2A1010';
  const icone      = isReceita ? 'arrow-up' : 'arrow-down';
  const descricao  = t.descricao.replace('[EdyRun] ', '');

  return (
    <View style={[styles.item, isEdyRun && styles.itemEdyRun]}>
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
  container: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titulo: { fontSize: 13, fontWeight: '600', color: '#F0F0FF' },
  verTodas: { fontSize: 11, color: '#6C63FF' },
  filtros: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  filtroBtn: {
    backgroundColor: '#141428',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#252545',
  },
  filtroBtnAtivo: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  filtroTexto: { fontSize: 10, color: '#5A5A80' },
  filtroTextoAtivo: { fontSize: 10, color: '#fff', fontWeight: '600' },
  lista: { gap: 8 },
  item: {
    backgroundColor: '#141428',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252545',
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  itemEdyRun: { borderColor: '#00D4AA22' },
  iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  itemInfo: { flex: 1, minWidth: 0 },
  itemTituloRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  itemDesc: { fontSize: 12, fontWeight: '500', color: '#F0F0FF', flex: 1 },
  badgeEdyRun: {
    backgroundColor: '#00D4AA22',
    borderWidth: 1,
    borderColor: '#00D4AA44',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeEdyRunText: { fontSize: 8, color: '#00D4AA' },
  itemMeta: { fontSize: 10, color: '#5A5A80' },
  itemValor: { fontSize: 12, fontWeight: '700', flexShrink: 0 },
  vazio: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  vazioTexto: { fontSize: 12, color: '#3A3A5A' },
});
