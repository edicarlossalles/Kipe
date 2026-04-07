// src/screens/Launch/LaunchScreen.tsx
//
// Tela de lançamento: adicionar receita ou despesa com categorias
// criadas pelo próprio usuário, salvas no Firestore.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, addDoc, serverTimestamp,
  onSnapshot, query, where, deleteDoc, doc,
} from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';

// ─── tipos ───────────────────────────────────────────────────────────────────

type Tipo = 'receita' | 'despesa';

interface Categoria {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  tipo: Tipo | 'ambos';
}

// ─── constantes ──────────────────────────────────────────────────────────────

const ICONES = [
  'cart-outline', 'car-outline', 'home-outline', 'restaurant-outline',
  'medkit-outline', 'school-outline', 'game-controller-outline', 'airplane-outline',
  'shirt-outline', 'barbell-outline', 'musical-notes-outline', 'gift-outline',
  'paw-outline', 'leaf-outline', 'briefcase-outline', 'cash-outline',
];

const CORES = [
  '#6C63FF', '#00D4AA', '#FF5C5C', '#FFB830',
  '#00BCD4', '#FF8C42', '#4CAF50', '#E91E63',
  '#9C27B0', '#3F51B5', '#009688', '#FF5722',
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatValorInput(raw: string): string {
  const nums = raw.replace(/\D/g, '');
  if (!nums) return '';
  const centavos = parseInt(nums, 10);
  return (centavos / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCentavos(formatted: string): number {
  const nums = formatted.replace(/\D/g, '');
  return parseInt(nums || '0', 10);
}

function formatDataExibicao(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function formatDateInput(value: string): string {
  const nums = value.replace(/\D/g, '').slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
}

function parseDateInput(value: string): Date | null {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null;
  const [dia, mes, ano] = value.split('/').map(Number);
  const date = new Date(ano, mes - 1, dia);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== ano ||
    date.getMonth() !== mes - 1 ||
    date.getDate() !== dia
  ) {
    return null;
  }
  return date;
}

// ─── modal criar categoria ────────────────────────────────────────────────────

function ModalCriarCategoria({
  visible, onClose, onSalvar,
}: {
  visible: boolean;
  onClose: () => void;
  onSalvar: (cat: Omit<Categoria, 'id'>) => Promise<void>;
}) {
  const [nome, setNome] = useState('');
  const [icone, setIcone] = useState(ICONES[0]);
  const [cor, setCor] = useState(CORES[0]);
  const [tipo, setTipo] = useState<Tipo | 'ambos'>('ambos');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Digite um nome para a categoria.');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({ nome: nome.trim(), icone, cor, tipo });
      setNome('');
      setIcone(ICONES[0]);
      setCor(CORES[0]);
      setTipo('ambos');
      onClose();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível criar a categoria.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modal.overlay}>
        <View style={modal.box}>
          <View style={modal.header}>
            <Text style={modal.titulo}>Nova categoria</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color="#5A5A80" />
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={modal.preview}>
            <View style={[modal.previewIcon, { backgroundColor: cor + '33' }]}>
              <Ionicons name={icone as any} size={22} color={cor} />
            </View>
            <Text style={[modal.previewNome, { color: cor }]}>{nome || 'Nome da categoria'}</Text>
          </View>

          {/* Nome */}
          <Text style={modal.label}>Nome</Text>
          <TextInput
            style={modal.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Ex: Alimentação, Salário..."
            placeholderTextColor="#3A3A5A"
            maxLength={24}
          />

          {/* Tipo */}
          <Text style={modal.label}>Tipo</Text>
          <View style={modal.tipoRow}>
            {(['ambos', 'despesa', 'receita'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[modal.tipoBtn, tipo === t && { backgroundColor: CORES[0], borderColor: CORES[0] }]}
                onPress={() => setTipo(t)}
              >
                <Text style={[modal.tipoBtnTexto, tipo === t && { color: '#fff' }]}>
                  {t === 'ambos' ? 'Ambos' : t === 'despesa' ? 'Despesa' : 'Receita'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Ícone */}
          <Text style={modal.label}>Ícone</Text>
          <View style={modal.grade}>
            {ICONES.map(ic => (
              <TouchableOpacity
                key={ic}
                style={[modal.iconeBtn, icone === ic && { backgroundColor: cor + '33', borderColor: cor }]}
                onPress={() => setIcone(ic)}
              >
                <Ionicons name={ic as any} size={18} color={icone === ic ? cor : '#5A5A80'} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Cor */}
          <Text style={modal.label}>Cor</Text>
          <View style={modal.grade}>
            {CORES.map(c => (
              <TouchableOpacity
                key={c}
                style={[modal.corBtn, { backgroundColor: c }, cor === c && modal.corBtnAtiva]}
                onPress={() => setCor(c)}
              >
                {cor === c && <Ionicons name="checkmark" size={14} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Botões */}
          <View style={modal.btns}>
            <TouchableOpacity style={modal.btnCancelar} onPress={onClose}>
              <Text style={modal.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.btnSalvar, salvando && { opacity: 0.6 }]}
              onPress={handleSalvar}
              disabled={salvando}
            >
              {salvando
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={modal.btnSalvarTexto}>Criar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── tela principal ───────────────────────────────────────────────────────────

export default function LaunchScreen({ navigation }: any) {
  const { user } = useAuth();
  const { adicionarTransacao } = useFinance();

  const [tipo, setTipo] = useState<Tipo>('despesa');
  const [valorRaw, setValorRaw] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoriaSel, setCategoriaSel] = useState<Categoria | null>(null);
  const [data, setData] = useState(new Date());
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [modalData, setModalData] = useState(false);
  const [dataInput, setDataInput] = useState(formatDataExibicao(new Date()));

  // Carrega categorias do Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'categorias_kipo'),
      where('uid', '==', user.uid),
    );
    const unsub = onSnapshot(q, snap => {
      const lista: Categoria[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Categoria, 'id'>),
      }));
      setCategorias(lista.sort((a, b) => a.nome.localeCompare(b.nome)));
    });
    return unsub;
  }, [user]);

  const categoriasFiltradas = categorias.filter(
    c => c.tipo === 'ambos' || c.tipo === tipo,
  );

  async function criarCategoria(cat: Omit<Categoria, 'id'>) {
    if (!user) return;
    await addDoc(collection(db, 'categorias_kipo'), {
      ...cat,
      uid: user.uid,
    });
  }

  async function excluirCategoria(id: string) {
    Alert.alert('Excluir categoria', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(db, 'categorias_kipo', id));
          if (categoriaSel?.id === id) setCategoriaSel(null);
        },
      },
    ]);
  }

  async function handleSalvar() {
    const centavos = parseCentavos(valorRaw);
    if (centavos <= 0) {
      Alert.alert('Atenção', 'Digite um valor válido.');
      return;
    }
    if (!descricao.trim()) {
      Alert.alert('Atenção', 'Digite uma descrição.');
      return;
    }
    if (!categoriaSel) {
      Alert.alert('Atenção', 'Selecione uma categoria.');
      return;
    }

    setSalvando(true);
    try {
      await adicionarTransacao({
        tipo,
        valor: centavos,
        descricao: descricao.trim(),
        categoria: categoriaSel.nome.toLowerCase(),
        data,
        origem: 'kipo',
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  function abrirModalData() {
    setDataInput(formatDataExibicao(data));
    setModalData(true);
  }

  function confirmarData() {
    const novaData = parseDateInput(dataInput);
    if (!novaData) {
      Alert.alert('Atenção', 'Digite uma data válida no formato DD/MM/AAAA.');
      return;
    }
    setData(novaData);
    setModalData(false);
  }

  const corTipo = tipo === 'receita' ? '#00D4AA' : '#FF5C5C';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />

      <ModalCriarCategoria
        visible={modalCategoria}
        onClose={() => setModalCategoria(false)}
        onSalvar={criarCategoria}
      />

      <Modal visible={modalData} transparent animationType="fade">
        <View style={modal.overlayCenter}>
          <View style={modal.dialogBox}>
            <View style={modal.header}>
              <Text style={modal.titulo}>Alterar data</Text>
              <TouchableOpacity onPress={() => setModalData(false)}>
                <Ionicons name="close" size={20} color="#5A5A80" />
              </TouchableOpacity>
            </View>

            <Text style={modal.label}>Data do lançamento</Text>
            <TextInput
              style={modal.input}
              value={dataInput}
              onChangeText={(v) => setDataInput(formatDateInput(v))}
              placeholder="07/04/2026"
              placeholderTextColor="#3A3A5A"
              keyboardType="numeric"
              maxLength={10}
              autoFocus
            />

            <View style={modal.btns}>
              <TouchableOpacity style={modal.btnCancelar} onPress={() => setModalData(false)}>
                <Text style={modal.btnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modal.btnSalvar} onPress={confirmarData}>
                <Text style={modal.btnSalvarTexto}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#9090BB" />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Novo lançamento</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Toggle Receita / Despesa */}
          <View style={styles.toggleRow}>
            {(['despesa', 'receita'] as Tipo[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.toggleBtn, tipo === t && {
                  backgroundColor: t === 'receita' ? '#00D4AA22' : '#FF5C5C22',
                  borderColor: t === 'receita' ? '#00D4AA' : '#FF5C5C',
                }]}
                onPress={() => { setTipo(t); setCategoriaSel(null); }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t === 'receita' ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color={tipo === t ? (t === 'receita' ? '#00D4AA' : '#FF5C5C') : '#5A5A80'}
                />
                <Text style={[styles.toggleTexto, tipo === t && {
                  color: t === 'receita' ? '#00D4AA' : '#FF5C5C',
                }]}>
                  {t === 'receita' ? 'Receita' : 'Despesa'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Valor */}
          <View style={styles.valorBox}>
            <Text style={styles.valorPrefixo}>R$</Text>
            <TextInput
              style={[styles.valorInput, { color: corTipo }]}
              value={valorRaw}
              onChangeText={v => setValorRaw(formatValorInput(v))}
              placeholder="0,00"
              placeholderTextColor="#2A2A45"
              keyboardType="numeric"
              maxLength={14}
            />
          </View>

          {/* Descrição */}
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={styles.input}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Ex: Supermercado, Salário..."
            placeholderTextColor="#3A3A5A"
            maxLength={60}
          />

          {/* Data */}
          <Text style={styles.label}>Data</Text>
          <View style={styles.dataRow}>
            <TouchableOpacity
              style={styles.dataBtn}
              onPress={abrirModalData}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={15} color="#6C63FF" />
              <Text style={styles.dataTexto}>{formatDataExibicao(data)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dataHoje}
              onPress={() => setData(new Date())}
            >
              <Text style={styles.dataHojeTexto}>Hoje</Text>
            </TouchableOpacity>
          </View>

          {/* Categorias */}
          <View style={styles.catHeader}>
            <Text style={styles.label}>Categoria</Text>
            <TouchableOpacity
              style={styles.btnNovaCat}
              onPress={() => setModalCategoria(true)}
            >
              <Ionicons name="add" size={13} color="#6C63FF" />
              <Text style={styles.btnNovaCatTexto}>Nova</Text>
            </TouchableOpacity>
          </View>

          {categoriasFiltradas.length === 0 ? (
            <TouchableOpacity style={styles.catVazio} onPress={() => setModalCategoria(true)}>
              <Ionicons name="folder-open-outline" size={28} color="#3A3A5A" />
              <Text style={styles.catVazioTexto}>Nenhuma categoria ainda</Text>
              <Text style={styles.catVazioSub}>Toque para criar a primeira</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.catGrade}>
              {categoriasFiltradas.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catItem,
                    categoriaSel?.id === cat.id && {
                      borderColor: cat.cor,
                      backgroundColor: cat.cor + '18',
                    },
                  ]}
                  onPress={() => setCategoriaSel(cat)}
                  onLongPress={() => excluirCategoria(cat.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.catIconBox, { backgroundColor: cat.cor + '22' }]}>
                    <Ionicons name={cat.icone as any} size={16} color={cat.cor} />
                  </View>
                  <Text style={[
                    styles.catNome,
                    categoriaSel?.id === cat.id && { color: cat.cor },
                  ]} numberOfLines={1}>
                    {cat.nome}
                  </Text>
                  {categoriaSel?.id === cat.id && (
                    <View style={[styles.catCheck, { backgroundColor: cat.cor }]}>
                      <Ionicons name="checkmark" size={9} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.catDica}>Segure uma categoria para excluir</Text>

        </ScrollView>

        {/* Botão salvar */}
        <View style={styles.rodape}>
          <TouchableOpacity
            style={[styles.btnSalvar, { backgroundColor: corTipo }, salvando && { opacity: 0.6 }]}
            onPress={handleSalvar}
            disabled={salvando}
            activeOpacity={0.85}
          >
            {salvando
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={styles.btnSalvarTexto}>
                    Salvar {tipo === 'receita' ? 'receita' : 'despesa'}
                  </Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F1A' },
  scroll: { flex: 1, paddingHorizontal: 16 },
  scrollContent: { paddingBottom: 140 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16,
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#252545',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitulo: { fontSize: 15, fontWeight: '700', color: '#F0F0FF' },

  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 14,
    backgroundColor: '#141428', borderWidth: 1, borderColor: '#252545',
  },
  toggleTexto: { fontSize: 13, fontWeight: '600', color: '#5A5A80' },

  valorBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 28,
  },
  valorPrefixo: { fontSize: 22, fontWeight: '700', color: '#3A3A5A' },
  valorInput: { fontSize: 42, fontWeight: '700', minWidth: 120, textAlign: 'center' },

  label: { fontSize: 11, color: '#5A5A80', marginBottom: 8, fontWeight: '600', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#141428', borderWidth: 1, borderColor: '#252545',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 13, color: '#F0F0FF', marginBottom: 20,
  },

  dataRow: { flexDirection: 'row', gap: 10, marginBottom: 20, alignItems: 'center' },
  dataBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#141428', borderWidth: 1, borderColor: '#252545',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  dataTexto: { fontSize: 13, color: '#F0F0FF' },
  dataHoje: {
    backgroundColor: '#6C63FF22', borderWidth: 1, borderColor: '#6C63FF55',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  dataHojeTexto: { fontSize: 12, color: '#6C63FF', fontWeight: '600' },

  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  btnNovaCat: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#6C63FF22', borderWidth: 1, borderColor: '#6C63FF44',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  btnNovaCatTexto: { fontSize: 11, color: '#6C63FF', fontWeight: '600' },

  catVazio: {
    alignItems: 'center', paddingVertical: 28, gap: 6,
    backgroundColor: '#141428', borderRadius: 16,
    borderWidth: 1, borderColor: '#252545', borderStyle: 'dashed',
  },
  catVazioTexto: { fontSize: 13, color: '#3A3A5A', fontWeight: '600' },
  catVazioSub: { fontSize: 11, color: '#2A2A45' },

  catGrade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#141428', borderWidth: 1, borderColor: '#252545',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    position: 'relative',
  },
  catIconBox: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  catNome: { fontSize: 12, color: '#9090BB', fontWeight: '500', maxWidth: 90 },
  catCheck: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  catDica: { fontSize: 10, color: '#2A2A45', textAlign: 'center', marginTop: 10 },

  rodape: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: '#0F0F1A',
    borderTopWidth: 1, borderTopColor: '#1A1A2E',
  },
  btnSalvar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, paddingVertical: 16,
  },
  btnSalvarTexto: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── estilos do modal ─────────────────────────────────────────────────────────

const modal = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
  overlayCenter: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'center',
    padding: 24,
  },
  box: {
    backgroundColor: '#1A1A2E', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: '#252545', padding: 24,
  },
  dialogBox: {
    backgroundColor: '#1A1A2E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#252545',
    padding: 24,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titulo: { fontSize: 15, fontWeight: '700', color: '#F0F0FF' },

  preview: { alignItems: 'center', gap: 8, marginBottom: 20 },
  previewIcon: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  previewNome: { fontSize: 13, fontWeight: '600' },

  label: { fontSize: 11, color: '#5A5A80', marginBottom: 6, marginTop: 14, fontWeight: '600' },
  input: {
    backgroundColor: '#0F0F1A', borderWidth: 1, borderColor: '#252545',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 13, color: '#F0F0FF', marginBottom: 4,
  },

  tipoRow: { flexDirection: 'row', gap: 8 },
  tipoBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#0F0F1A', borderWidth: 1, borderColor: '#252545',
    alignItems: 'center',
  },
  tipoBtnTexto: { fontSize: 12, color: '#5A5A80', fontWeight: '600' },

  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  iconeBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#0F0F1A', borderWidth: 1, borderColor: '#252545',
    justifyContent: 'center', alignItems: 'center',
  },
  corBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  corBtnAtiva: {
    borderWidth: 2, borderColor: '#fff',
  },

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
});
