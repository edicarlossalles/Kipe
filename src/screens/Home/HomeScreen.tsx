// src/screens/Home/HomeScreen.tsx
//
// Responsabilidade única: compor os componentes da Home.
// Sem lógica de dados — tudo vem do useHomeData.

import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useHomeData } from './hooks/useHomeData';
import SaldoCard from './components/SaldoCard';
import AcoesRapidas from './components/AcoesRapidas';
import GraficoRosca from './components/GraficoRosca';
import ListaTransacoes from './components/ListaTransacoes';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const {
    loading,
    filtro, setFiltro,
    mesLabel,
    irMesAnterior, irProximoMes,
    saldoMes, receitasMes, despesasMes,
    transacoesFiltradas,
    categorias,
    miniBarras,
  } = useHomeData();

  const primeiroNome = user?.displayName?.split(' ')[0] ?? 'Você';
  const iniciais = (user?.displayName ?? 'KP')
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} tintColor="#6C63FF" colors={['#6C63FF']} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>Bem-vindo,</Text>
            <Text style={styles.headerNome}>{primeiroNome}</Text>
          </View>
          <View style={styles.headerAcoes}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={18} color="#9090BB" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.avatarBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarTexto}>{iniciais}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <SaldoCard
          saldo={saldoMes}
          receitas={receitasMes}
          despesas={despesasMes}
          mesLabel={mesLabel}
          miniBarras={miniBarras}
          onMesAnterior={irMesAnterior}
          onProximoMes={irProximoMes}
        />

        <AcoesRapidas
          onLancar={() => navigation.navigate('Launch')}
          onRelatorio={() => navigation.navigate('Projeção')}
          onMetas={() => navigation.navigate('Goals')}
          onCarteira={() => navigation.navigate('Carteira')}
        />

        <GraficoRosca
          categorias={categorias}
          totalDespesas={despesasMes}
          mesLabel={mesLabel}
        />

        <ListaTransacoes
          transacoes={transacoesFiltradas}
          filtro={filtro}
          onFiltroChange={setFiltro}
          onVerTodas={() => {}}
        />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Launch')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F1A' },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  headerSub: { fontSize: 11, color: '#5A5A80', marginBottom: 2 },
  headerNome: { fontSize: 18, fontWeight: '700', color: '#F0F0FF', letterSpacing: -0.3 },
  headerAcoes: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#2E2E50',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#6C63FF',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarTexto: { fontSize: 12, fontWeight: '700', color: '#fff' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#6C63FF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});
