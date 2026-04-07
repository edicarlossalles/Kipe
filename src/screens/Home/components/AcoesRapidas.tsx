// src/screens/Home/components/AcoesRapidas.tsx
// Responsabilidade: renderizar os 4 botões de acesso rápido.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Acao {
  label: string;
  icone: string;
  cor: string;
  fundo: string;
  onPress: () => void;
}

interface Props {
  onLancar: () => void;
  onRelatorio: () => void;
  onMetas: () => void;
  onCarteira: () => void;
}

export default function AcoesRapidas({ onLancar, onRelatorio, onMetas, onCarteira }: Props) {
  const acoes: Acao[] = [
    { label: 'Lançar',   icone: 'add',           cor: '#6C63FF', fundo: '#6C63FF22', onPress: onLancar },
    { label: 'Relatório',icone: 'trending-up',    cor: '#00D4AA', fundo: '#00D4AA15', onPress: onRelatorio },
    { label: 'Metas',    icone: 'time-outline',   cor: '#FFB830', fundo: '#FFB83015', onPress: onMetas },
    { label: 'Carteira', icone: 'wallet-outline', cor: '#FF5C5C', fundo: '#FF5C5C15', onPress: onCarteira },
  ];

  return (
    <View style={styles.container}>
      {acoes.map((acao) => (
        <TouchableOpacity
          key={acao.label}
          style={styles.btn}
          onPress={acao.onPress}
          activeOpacity={0.75}
        >
          <View style={[styles.iconBox, { backgroundColor: acao.fundo }]}>
            <Ionicons name={acao.icone as any} size={16} color={acao.cor} />
          </View>
          <Text style={styles.label}>{acao.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  btn: {
    flex: 1,
    backgroundColor: '#141428',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252545',
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { fontSize: 10, color: '#9090BB' },
});
