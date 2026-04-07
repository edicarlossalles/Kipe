// src/screens/Home/components/SaldoCard.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MiniBarDado } from '../hooks/useHomeData';

interface Props {
  saldo: number;
  receitas: number;
  despesas: number;
  mesLabel: string;
  miniBarras: MiniBarDado[];
  onMesAnterior: () => void;
  onProximoMes: () => void;
}

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function SaldoCard({
  saldo, receitas, despesas,
  mesLabel, miniBarras,
  onMesAnterior, onProximoMes,
}: Props) {
  const saldoNegativo = saldo < 0;
  const maxValor = Math.max(...miniBarras.map(b => b.valor), 1);

  return (
    <View style={styles.card}>
      <View style={styles.mesRow}>
        <TouchableOpacity onPress={onMesAnterior} style={styles.mesBtn}>
          <Ionicons name="chevron-back" size={14} color="#9090BB" />
        </TouchableOpacity>
        <View style={styles.mesLabel}>
          <View style={styles.mesDot} />
          <Text style={styles.mesText}>{mesLabel}</Text>
        </View>
        <TouchableOpacity onPress={onProximoMes} style={styles.mesBtn}>
          <Ionicons name="chevron-forward" size={14} color="#9090BB" />
        </TouchableOpacity>
      </View>

      <Text style={styles.saldoLabel}>Saldo disponível</Text>
      <Text style={[styles.saldoValor, saldoNegativo && styles.saldoNegativo]}>
        {formatBRL(saldo)}
      </Text>

      <View style={styles.barras}>
        {miniBarras.map((b, i) => {
          const altura = b.valor > 0 ? Math.max((b.valor / maxValor) * 100, 8) : 8;
          return (
            <View key={i} style={styles.barraCol}>
              <View style={[
                styles.barra,
                { height: `${altura}%` },
                b.ativo && styles.barraAtiva,
              ]} />
            </View>
          );
        })}
      </View>

      <View style={styles.resumoRow}>
        <View style={[styles.resumoItem, styles.resumoItemBorder]}>
          <View style={styles.resumoLabelRow}>
            <View style={[styles.dot, { backgroundColor: '#00D4AA' }]} />
            <Text style={styles.resumoLabel}>Entradas</Text>
          </View>
          <Text style={[styles.resumoValor, { color: '#00D4AA' }]}>{formatBRL(receitas)}</Text>
        </View>
        <View style={styles.resumoItem}>
          <View style={styles.resumoLabelRow}>
            <View style={[styles.dot, { backgroundColor: '#FF5C5C' }]} />
            <Text style={styles.resumoLabel}>Saídas</Text>
          </View>
          <Text style={[styles.resumoValor, { color: '#FF5C5C' }]}>{formatBRL(despesas)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#6C63FF44',
    marginBottom: 16,
    backgroundColor: '#1E0F45',
  },
  mesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  mesBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#FFFFFF11',
    justifyContent: 'center', alignItems: 'center',
  },
  mesLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mesDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6C63FF' },
  mesText: { fontSize: 13, fontWeight: '600', color: '#F0F0FF' },
  saldoLabel: { fontSize: 11, color: '#9090BB88', letterSpacing: 0.5, marginBottom: 4 },
  saldoValor: { fontSize: 30, fontWeight: '700', color: '#F0F0FF', letterSpacing: -1, marginBottom: 16 },
  saldoNegativo: { color: '#FF5C5C' },
  barras: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 32, gap: 3, marginBottom: 14,
  },
  barraCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  barra: { width: '100%', backgroundColor: '#FFFFFF12', borderRadius: 3 },
  barraAtiva: { backgroundColor: '#6C63FF' },
  resumoRow: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: '#FFFFFF11', paddingTop: 14,
  },
  resumoItem: { flex: 1 },
  resumoItemBorder: { borderRightWidth: 1, borderRightColor: '#FFFFFF11' },
  resumoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  resumoLabel: { fontSize: 10, color: '#9090BB' },
  resumoValor: { fontSize: 13, fontWeight: '600' },
});