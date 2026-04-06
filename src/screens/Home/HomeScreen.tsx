// src/screens/Home/HomeScreen.tsx

import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { saldoDisponivel, totalReceitas, totalDespesas, transacoes, loading } = useFinance();

  const nome = user?.displayName?.split(' ')[0] ?? 'você';
  const saldoNegativo = saldoDisponivel < 0;

  const ultimasTransacoes = transacoes.slice(0, 5);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {nome} 👋</Text>
            <Text style={styles.subtitle}>Seu resumo financeiro</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Card de saldo */}
        <View style={[styles.card, styles.saldoCard]}>
          <Text style={styles.saldoLabel}>Saldo disponível</Text>
          <Text style={[styles.saldoValor, saldoNegativo && styles.saldoNegativo]}>
            {loading ? '...' : formatBRL(saldoDisponivel)}
          </Text>
          <View style={styles.saldoRow}>
            <View style={styles.saldoItem}>
              <Ionicons name="arrow-up-circle" size={16} color={Colors.accent} />
              <Text style={styles.saldoItemLabel}>Receitas</Text>
              <Text style={[styles.saldoItemValor, { color: Colors.accent }]}>
                {formatBRL(totalReceitas)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.saldoItem}>
              <Ionicons name="arrow-down-circle" size={16} color={Colors.danger} />
              <Text style={styles.saldoItemLabel}>Despesas</Text>
              <Text style={[styles.saldoItemValor, { color: Colors.danger }]}>
                {formatBRL(totalDespesas)}
              </Text>
            </View>
          </View>
        </View>

        {/* Revisor de gastos */}
        <Text style={styles.sectionTitle}>Revisor de gastos</Text>
        <View style={styles.revisorGrid}>
          <TouchableOpacity style={[styles.revisorCard, { backgroundColor: '#1E1E35' }]}>
            <Ionicons name="cart-outline" size={24} color={Colors.categoryEssential} />
            <Text style={styles.revisorValor}>R$ 0,00</Text>
            <Text style={styles.revisorLabel}>Essenciais</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.revisorCard, { backgroundColor: '#1A2E1A' }]}>
            <Ionicons name="cash-outline" size={24} color={Colors.categoryDebt} />
            <Text style={styles.revisorValor}>R$ 0,00</Text>
            <Text style={styles.revisorLabel}>Dívidas e parcelas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.revisorCard, { backgroundColor: '#1A1A30' }]}>
            <Ionicons name="trending-up-outline" size={24} color={Colors.categoryIncome} />
            <Text style={styles.revisorValor}>R$ 0,00</Text>
            <Text style={styles.revisorLabel}>Rendas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.revisorCard, styles.revisorCardOutline]}
            onPress={() => navigation.navigate('Categories')}
          >
            <Ionicons name="grid-outline" size={20} color={Colors.primary} />
            <Text style={[styles.revisorLabel, { color: Colors.primary, marginTop: 4 }]}>
              Ver todas as categorias
            </Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Últimas transações */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Últimas transações</Text>
          <TouchableOpacity>
            <Text style={styles.verTodas}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        {ultimasTransacoes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Nenhuma transação ainda</Text>
          </View>
        ) : (
          ultimasTransacoes.map((t) => (
            <View key={t.id} style={styles.transacaoItem}>
              <View style={[styles.transacaoIcon,
                { backgroundColor: t.tipo === 'receita' ? '#0D2A1F' : '#2A1010' }]}>
                <Ionicons
                  name={t.tipo === 'receita' ? 'arrow-up' : 'arrow-down'}
                  size={16}
                  color={t.tipo === 'receita' ? Colors.accent : Colors.danger}
                />
              </View>
              <View style={styles.transacaoInfo}>
                <Text style={styles.transacaoDesc}>{t.descricao}</Text>
                <Text style={styles.transacaoCategoria}>{t.categoria}</Text>
              </View>
              <Text style={[styles.transacaoValor,
                { color: t.tipo === 'receita' ? Colors.accent : Colors.danger }]}>
                {t.tipo === 'receita' ? '+' : '-'} {formatBRL(t.valor)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Botão + flutuante */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Launch')}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 100 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.lg,
  },
  greeting: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.cardBorder,
    marginBottom: Spacing.lg,
  },
  saldoCard: { borderColor: Colors.primaryDark },
  saldoLabel: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  saldoValor: {
    fontSize: Typography.fontSize.xxxl, fontWeight: '700',
    color: Colors.textPrimary, marginVertical: Spacing.sm,
  },
  saldoNegativo: { color: Colors.danger },
  saldoRow: { flexDirection: 'row', marginTop: Spacing.sm },
  saldoItem: { flex: 1, alignItems: 'center', gap: 4 },
  saldoItemLabel: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },
  saldoItemValor: { fontSize: Typography.fontSize.md, fontWeight: '600' },
  divider: { width: 1, backgroundColor: Colors.cardBorder },
  sectionTitle: {
    fontSize: Typography.fontSize.lg, fontWeight: '600',
    color: Colors.textPrimary, marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.md, marginTop: Spacing.sm,
  },
  verTodas: { fontSize: Typography.fontSize.sm, color: Colors.primary },
  revisorGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  revisorCard: {
    width: '47%', borderRadius: BorderRadius.md, padding: Spacing.md,
    gap: 6, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  revisorCardOutline: {
    borderColor: Colors.primary, backgroundColor: Colors.background,
    alignItems: 'flex-start',
  },
  revisorValor: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  revisorLabel: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  transacaoItem: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
    backgroundColor: Colors.card, borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  transacaoIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  transacaoInfo: { flex: 1 },
  transacaoDesc: { fontSize: Typography.fontSize.md, color: Colors.textPrimary, fontWeight: '500' },
  transacaoCategoria: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginTop: 2 },
  transacaoValor: { fontSize: Typography.fontSize.md, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyText: { color: Colors.textMuted, marginTop: Spacing.sm },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});
