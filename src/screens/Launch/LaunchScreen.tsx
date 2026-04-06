// src/screens/Launch/LaunchScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { useFinance } from '../../context/FinanceContext';

const CATEGORIAS = [
  { id: 'essenciais', label: 'Essenciais', icon: 'cart-outline', cor: Colors.categoryEssential },
  { id: 'alimentacao', label: 'Alimentação', icon: 'restaurant-outline', cor: Colors.categoryFood },
  { id: 'saude', label: 'Saúde', icon: 'medkit-outline', cor: Colors.categoryHealth },
  { id: 'lazer', label: 'Lazer', icon: 'game-controller-outline', cor: Colors.categoryLeisure },
  { id: 'dividas', label: 'Dívidas', icon: 'cash-outline', cor: Colors.categoryDebt },
  { id: 'rendas', label: 'Renda', icon: 'trending-up-outline', cor: Colors.categoryIncome },
];

export default function LaunchScreen({ navigation }: any) {
  const { adicionarTransacao } = useFinance();
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('essenciais');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (!valorNum || isNaN(valorNum)) {
      Alert.alert('Atenção', 'Informe um valor válido.');
      return;
    }
    if (!descricao.trim()) {
      Alert.alert('Atenção', 'Informe uma descrição.');
      return;
    }

    setSalvando(true);
    try {
      await adicionarTransacao({
        tipo,
        valor: Math.round(valorNum * 100), // salva em centavos
        descricao: descricao.trim(),
        categoria,
        data: new Date(),
        origem: 'kipo',
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo lançamento</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Tipo */}
        <View style={styles.tipoRow}>
          <TouchableOpacity
            style={[styles.tipoBtn, tipo === 'despesa' && styles.tipoBtnDespesa]}
            onPress={() => setTipo('despesa')}
          >
            <Ionicons name="arrow-down" size={16} color={tipo === 'despesa' ? Colors.white : Colors.textMuted} />
            <Text style={[styles.tipoBtnText, tipo === 'despesa' && { color: Colors.white }]}>Despesa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tipoBtn, tipo === 'receita' && styles.tipoBtnReceita]}
            onPress={() => setTipo('receita')}
          >
            <Ionicons name="arrow-up" size={16} color={tipo === 'receita' ? Colors.white : Colors.textMuted} />
            <Text style={[styles.tipoBtnText, tipo === 'receita' && { color: Colors.white }]}>Receita</Text>
          </TouchableOpacity>
        </View>

        {/* Valor */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Valor (R$)</Text>
          <TextInput
            style={styles.input}
            value={valor}
            onChangeText={setValor}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Descrição */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={styles.input}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Ex: Conta de luz"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Categoria */}
        <Text style={styles.label}>Categoria</Text>
        <View style={styles.categoriasGrid}>
          {CATEGORIAS.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoriaItem, categoria === cat.id && { borderColor: cat.cor, borderWidth: 2 }]}
              onPress={() => setCategoria(cat.id)}
            >
              <Ionicons name={cat.icon as any} size={20} color={cat.cor} />
              <Text style={styles.categoriaLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Salvar */}
        <TouchableOpacity
          style={[styles.salvarBtn, salvando && { opacity: 0.6 }]}
          onPress={handleSalvar}
          disabled={salvando}
        >
          <Text style={styles.salvarBtnText}>{salvando ? 'Salvando...' : 'Salvar'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  headerTitle: { fontSize: Typography.fontSize.lg, fontWeight: '600', color: Colors.textPrimary },
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 40 },
  tipoRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  tipoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  tipoBtnDespesa: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  tipoBtnReceita: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tipoBtnText: { fontSize: Typography.fontSize.md, fontWeight: '600', color: Colors.textMuted },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.md,
    padding: Spacing.md, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.cardBorder,
    fontSize: Typography.fontSize.md,
  },
  categoriasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  categoriaItem: {
    width: '30%', padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.card, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  categoriaLabel: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  salvarBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md,
  },
  salvarBtnText: { color: Colors.white, fontSize: Typography.fontSize.lg, fontWeight: '700' },
});
