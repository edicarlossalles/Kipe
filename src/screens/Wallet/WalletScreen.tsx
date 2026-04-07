// src/screens/Wallet/WalletScreen.tsx
//
// Tela de Carteira: visualiza contas (dinheiro, poupança, cartão de crédito),
// permite adicionar novas contas e ver transações por conta.

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Modal, TextInput, Alert,
  ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, addDoc, onSnapshot, query,
  where, deleteDoc, doc, orderBy,
} from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── tipos ───────────────────────────────────────────────────────────────────

type TipoConta = 'dinheiro' | 'poupanca' | 'cartao';

interface Conta {
  id: string;
  nome: string;
  tipo: TipoConta;
  saldoInicial: number;
  cor: string;
  uid: string;
}

// ─── constantes ──────────────────────────────────────────────────────────────

const TIPOS_CONTA: { key: TipoConta; label: string; icone: string; cor: string }[] = [
  { key: 'dinheiro', label: 'Dinheiro',       icone: 'cash-outline',        cor: '#00D4AA' },
  { key: 'poupanca', label: 'Poupança',        icone: 'wallet-outline',      cor: '#6C63FF' },
  { key: 'cartao',   label: 'Cartão de crédito', icone: 'card-outline',     cor: '#FFB830' },
];

const CORES = [
  '#6C63FF', '#00D4AA', '#FF5C5C', '#FFB830',
  '#00BCD4', '#FF8C42', '#4CAF50', '#E91E63',
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  });
}

function formatValorInput(raw: string): string {
  const nums = raw.replace(/\D/g, '');
  if (!nums) return '';
  const centavos = parseInt(nums, 10);
  return (centavos / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function parseCentavos(formatted: string): number {
  return parseInt(formatted.replace(/\D/g, '') || '0', 10);
}

function timestampToDate(data: any): Date {
  if (!data) return new Date();
  if (data?.toDate) return data.toDate();
  if (data instanceof Date) return data;
  return new Date(data);
}

function infoTipo(tipo: TipoConta) {
  return TIPOS_CONTA.find(t => t.key === tipo) ?? TIPOS_CONTA[0];
}

// ─── modal adicionar conta ────────────────────────────────────────────────────

function ModalAdicionarConta({
  visible, onClose, onSalvar,
}: {
  visible: boolean;
  onClose: () => void;
  onSalvar: (conta: Omit<Conta, 'id' | 'uid'>) => Promise<void>;
}) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoConta>('dinheiro');
  const [saldoRaw, setSaldoRaw] = useState('');
  const [cor, setCor] = useState(CORES[0]);
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    if (!nome.trim()) { Alert.alert('Atenção', 'Digite um nome para a conta.'); return; }
    setSalvando(true);
    try {
      await onSalvar({ nome: nome.trim(), tipo, saldoInicial: parseCentavos(saldoRaw), cor });
      setNome('');
      setSaldoRaw('');
      setTipo('dinheiro');
      setCor(CORES[0]);
      onClose();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível adicionar a conta.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modal.overlay}>
        <View style={modal.box}>
          <View style={modal.header}>
            <Text style={modal.titulo}>Nova conta</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color="#5A5A80" />
            </TouchableOpacity>
          </View>

          <Text style={modal.label}>Nome da conta</Text>
          <TextInput
            style={modal.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Ex: Nubank, Carteira..."
            placeholderTextColor="#3A3A5A"
            maxLength={30}
          />

          <Text style={modal.label}>Tipo</Text>
          <View style={modal.tipoRow}>
            {TIPOS_CONTA.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[modal.tipoBtn, tipo === t.key && { backgroundColor: t.cor + '22', borderColor: t.cor }]}
                onPress={() => setTipo(t.key)}
              >
                <Ionicons name={t.icone as any} size={16} color={tipo === t.key ? t.cor : '#5A5A80'} />
                <Text style={[modal.tipoBtnTexto, tipo === t.key && { color: t.cor }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={modal.label}>Saldo inicial</Text>
          <View style={modal.saldoRow}>
            <Text style={modal.saldoPrefixo}>R$</Text>
            <TextInput
              style={modal.saldoInput}
              value={saldoRaw}
              onChangeText={v => setSaldoRaw(formatValorInput(v))}
              placeholder="0,00"
              placeholderTextColor="#3A3A5A"
              keyboardType="numeric"
            />
          </View>

          <Text style={modal.label}>Cor</Text>
          <View style={modal.coresRow}>
            {CORES.map(c => (
              <TouchableOpacity
                key={c}
                style={[modal.corBtn, { backgroundColor: c }, cor === c && modal.corBtnAtiva]}
                onPress={() => setCor(c)}
              >
                {cor === c && <Ionicons name="checkmark" size={13} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>

          <View style={modal.btns}>
            <TouchableOpacity style={modal.btnCancelar} onPress={onClose}>
              <Text style={modal.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.btnSalvar, salvando && { opacity: 0.6 }]}
              onPress={handleSalvar} disabled={salvando}
            >
              {salvando
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={modal.btnSalvarTexto}>Adicionar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── modal transações da conta ────────────────────────────────────────────────

function ModalTransacoesConta({
  conta, transacoes, onClose,
}: {
  conta: Conta;
  transacoes: any[];
  onClose: () => void;
}) {
  const info = infoTipo(conta.tipo);
  const transacoesConta = transacoes
    .filter(t => t.categoria?.toLowerCase() === conta.nome.toLowerCase() ||
                 t.descricao?.toLowerCase().includes(conta.nome.toLowerCase()))
    .slice(0, 20);

  return (
    <Modal visible animationType="slide" transparent>
      <View style={modal.overlay}>
        <View style={[modal.box, { maxHeight: '80%' }]}>
          <View style={modal.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[modal.contaIconMini, { backgroundColor: conta.cor + '22' }]}>
                <Ionicons name={info.icone as any} size={16} color={conta.cor} />
              </View>
              <Text style={modal.titulo}>{conta.nome}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color="#5A5A80" />
            </TouchableOpacity>
          </View>

          {transacoesConta.length === 0 ? (
            <View style={modal.vazioBox}>
              <Ionicons name="receipt-outline" size={32} color="#3A3A5A" />
              <Text style={modal.vazioTexto}>Nenhuma transação encontrada</Text>
            </View>
          ) : (
            <FlatList
              data={transacoesConta}
              keyExtractor={t => t.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: t }) => {
                const isReceita = t.tipo === 'receita';
                return (
                  <View style={modal.transacaoItem}>
                    <View style={[modal.transacaoIcon, { backgroundColor: isReceita ? '#0D2A1F' : '#2A1010' }]}>
                      <Ionicons name={isReceita ? 'arrow-up' : 'arrow-down'} size={13} color={isReceita ? '#00D4AA' : '#FF5C5C'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={modal.transacaoDesc} numberOfLines={1}>{t.descricao}</Text>
                      <Text style={modal.transacaoData}>
                        {format(timestampToDate(t.data), "dd MMM yyyy", { locale: ptBR })}
                      </Text>
                    </View>
                    <Text style={[modal.transacaoValor, { color: isReceita ? '#00D4AA' : '#FF5C5C' }]}>
                      {isReceita ? '+' : '-'}{formatBRL(t.valor)}
                    </Text>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── tela principal ───────────────────────────────────────────────────────────

export default function WalletScreen({ navigation }: any) {
  const { user } = useAuth();
  const { transacoes } = useFinance();

  const [contas, setContas] = useState<Conta[]>([]);
  const [modalAdicionar, setModalAdicionar] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<Conta | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'contas_kipo'),
      where('uid', '==', user.uid),
    );
    return onSnapshot(q, snap => {
      setContas(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Conta, 'id'>) })));
    });
  }, [user]);

  async function adicionarConta(conta: Omit<Conta, 'id' | 'uid'>) {
    if (!user) return;
    await addDoc(collection(db, 'contas_kipo'), { ...conta, uid: user.uid });
  }

  async function excluirConta(id: string) {
    Alert.alert('Excluir conta', 'Tem certeza? Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteDoc(doc(db, 'contas_kipo', id)) },
    ]);
  }

  const totalSaldo = contas.reduce((acc, c) => {
    const receitasConta = transacoes
      .filter(t => t.tipo === 'receita' && t.categoria?.toLowerCase() === c.nome.toLowerCase())
      .reduce((a, t) => a + t.valor, 0);
    const despesasConta = transacoes
      .filter(t => t.tipo === 'despesa' && t.categoria?.toLowerCase() === c.nome.toLowerCase())
      .reduce((a, t) => a + t.valor, 0);
    return acc + c.saldoInicial + receitasConta - despesasConta;
  }, 0);

  function saldoConta(conta: Conta): number {
    const receitas = transacoes
      .filter(t => t.tipo === 'receita' && t.categoria?.toLowerCase() === conta.nome.toLowerCase())
      .reduce((a, t) => a + t.valor, 0);
    const despesas = transacoes
      .filter(t => t.tipo === 'despesa' && t.categoria?.toLowerCase() === conta.nome.toLowerCase())
      .reduce((a, t) => a + t.valor, 0);
    return conta.saldoInicial + receitas - despesas;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />

      <ModalAdicionarConta
        visible={modalAdicionar}
        onClose={() => setModalAdicionar(false)}
        onSalvar={adicionarConta}
      />

      {contaSelecionada && (
        <ModalTransacoesConta
          conta={contaSelecionada}
          transacoes={transacoes}
          onClose={() => setContaSelecionada(null)}
        />
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitulo}>Carteira</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalAdicionar(true)}>
            <Ionicons name="add" size={18} color="#6C63FF" />
          </TouchableOpacity>
        </View>

        {/* Card saldo total */}
        <View style={styles.saldoTotalCard}>
          <Text style={styles.saldoTotalLabel}>Patrimônio total</Text>
          <Text style={[styles.saldoTotalValor, totalSaldo < 0 && { color: '#FF5C5C' }]}>
            {formatBRL(totalSaldo)}
          </Text>
          <Text style={styles.saldoTotalSub}>{contas.length} conta{contas.length !== 1 ? 's' : ''} cadastrada{contas.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Resumo por tipo */}
        <View style={styles.resumoRow}>
          {TIPOS_CONTA.map(t => {
            const contasTipo = contas.filter(c => c.tipo === t.key);
            const totalTipo = contasTipo.reduce((acc, c) => acc + saldoConta(c), 0);
            return (
              <View key={t.key} style={styles.resumoItem}>
                <View style={[styles.resumoIconBox, { backgroundColor: t.cor + '22' }]}>
                  <Ionicons name={t.icone as any} size={14} color={t.cor} />
                </View>
                <Text style={styles.resumoLabel}>{t.label}</Text>
                <Text style={[styles.resumoValor, { color: t.cor }]}>{formatBRL(totalTipo)}</Text>
              </View>
            );
          })}
        </View>

        {/* Lista de contas */}
        <Text style={styles.secaoTitulo}>SUAS CONTAS</Text>

        {contas.length === 0 ? (
          <TouchableOpacity style={styles.vazioCard} onPress={() => setModalAdicionar(true)}>
            <Ionicons name="wallet-outline" size={32} color="#3A3A5A" />
            <Text style={styles.vazioTexto}>Nenhuma conta cadastrada</Text>
            <Text style={styles.vazioSub}>Toque para adicionar a primeira</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.contasLista}>
            {contas.map(conta => {
              const info = infoTipo(conta.tipo);
              const saldo = saldoConta(conta);
              const saldoNeg = saldo < 0;
              return (
                <TouchableOpacity
                  key={conta.id}
                  style={styles.contaCard}
                  onPress={() => setContaSelecionada(conta)}
                  onLongPress={() => excluirConta(conta.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.contaCardEsq}>
                    <View style={[styles.contaIconBox, { backgroundColor: conta.cor + '22' }]}>
                      <Ionicons name={info.icone as any} size={20} color={conta.cor} />
                    </View>
                    <View>
                      <Text style={styles.contaNome}>{conta.nome}</Text>
                      <Text style={styles.contaTipo}>{info.label}</Text>
                    </View>
                  </View>
                  <View style={styles.contaCardDir}>
                    <Text style={[styles.contaSaldo, saldoNeg && { color: '#FF5C5C' }]}>
                      {formatBRL(saldo)}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#3A3A5A" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.dica}>Segure uma conta para excluí-la</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F1A' },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  headerTitulo: { fontSize: 20, fontWeight: '700', color: '#F0F0FF' },
  addBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#6C63FF22', borderWidth: 1, borderColor: '#6C63FF44',
    justifyContent: 'center', alignItems: 'center',
  },

  saldoTotalCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#1E0F45', borderRadius: 20,
    borderWidth: 1, borderColor: '#6C63FF44',
    padding: 24, alignItems: 'center',
  },
  saldoTotalLabel: { fontSize: 11, color: '#9090BB88', letterSpacing: 0.5, marginBottom: 6 },
  saldoTotalValor: { fontSize: 34, fontWeight: '700', color: '#F0F0FF', letterSpacing: -1 },
  saldoTotalSub: { fontSize: 11, color: '#5A5A80', marginTop: 6 },

  resumoRow: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 16, marginBottom: 24,
  },
  resumoItem: {
    flex: 1, backgroundColor: '#141428',
    borderRadius: 14, borderWidth: 1, borderColor: '#252545',
    padding: 12, alignItems: 'center', gap: 5,
  },
  resumoIconBox: {
    width: 30, height: 30, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  resumoLabel: { fontSize: 9, color: '#5A5A80', textAlign: 'center' },
  resumoValor: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  secaoTitulo: {
    fontSize: 10, fontWeight: '700', color: '#3A3A5A',
    letterSpacing: 1.2, marginHorizontal: 20, marginBottom: 10,
  },

  vazioCard: {
    marginHorizontal: 16, padding: 32, alignItems: 'center', gap: 8,
    backgroundColor: '#141428', borderRadius: 18,
    borderWidth: 1, borderColor: '#252545', borderStyle: 'dashed',
  },
  vazioTexto: { fontSize: 13, color: '#3A3A5A', fontWeight: '600' },
  vazioSub: { fontSize: 11, color: '#2A2A45' },

  contasLista: { paddingHorizontal: 16, gap: 10 },
  contaCard: {
    backgroundColor: '#141428', borderRadius: 16,
    borderWidth: 1, borderColor: '#252545',
    padding: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  contaCardEsq: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contaIconBox: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  contaNome: { fontSize: 14, fontWeight: '600', color: '#F0F0FF', marginBottom: 2 },
  contaTipo: { fontSize: 11, color: '#5A5A80' },
  contaCardDir: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contaSaldo: { fontSize: 15, fontWeight: '700', color: '#F0F0FF' },

  dica: { fontSize: 10, color: '#2A2A45', textAlign: 'center', marginTop: 16 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  box: {
    backgroundColor: '#1A1A2E', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: '#252545', padding: 24,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titulo: { fontSize: 15, fontWeight: '700', color: '#F0F0FF' },
  label: { fontSize: 11, color: '#5A5A80', marginBottom: 8, marginTop: 14, fontWeight: '600' },
  input: {
    backgroundColor: '#0F0F1A', borderWidth: 1, borderColor: '#252545',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 13, color: '#F0F0FF',
  },
  tipoRow: { gap: 8 },
  tipoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 11, paddingHorizontal: 14,
    backgroundColor: '#0F0F1A', borderWidth: 1, borderColor: '#252545',
    borderRadius: 12,
  },
  tipoBtnTexto: { fontSize: 12, color: '#5A5A80', fontWeight: '500' },
  saldoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saldoPrefixo: { fontSize: 16, fontWeight: '700', color: '#5A5A80' },
  saldoInput: {
    flex: 1, backgroundColor: '#0F0F1A', borderWidth: 1, borderColor: '#252545',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 20, fontWeight: '700', color: '#F0F0FF',
  },
  coresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  corBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  corBtnAtiva: { borderWidth: 2, borderColor: '#fff' },
  btns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btnCancelar: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: '#0F0F1A', borderWidth: 1, borderColor: '#252545',
    alignItems: 'center',
  },
  btnCancelarTexto: { fontSize: 13, color: '#5A5A80', fontWeight: '600' },
  btnSalvar: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: '#6C63FF', alignItems: 'center',
  },
  btnSalvarTexto: { fontSize: 13, color: '#fff', fontWeight: '700' },
  contaIconMini: {
    width: 30, height: 30, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  transacaoItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E1E38',
  },
  transacaoIcon: {
    width: 30, height: 30, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  transacaoDesc: { fontSize: 12, color: '#F0F0FF', fontWeight: '500' },
  transacaoData: { fontSize: 10, color: '#5A5A80', marginTop: 2 },
  transacaoValor: { fontSize: 12, fontWeight: '700' },
  vazioBox: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  vazioTexto: { fontSize: 12, color: '#3A3A5A' },
});
