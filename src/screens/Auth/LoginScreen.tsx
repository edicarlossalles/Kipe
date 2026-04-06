// src/screens/Auth/LoginScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [modo, setModo] = useState<'login' | 'cadastro'>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit() {
    if (!email || !senha) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.');
      return;
    }
    setCarregando(true);
    try {
      if (modo === 'login') {
        await signIn(email, senha);
      } else {
        await signUp(email, senha);
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.logoArea}>
          <Text style={styles.logo}>Kipo 💰</Text>
          <Text style={styles.tagline}>Controle financeiro inteligente</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor={Colors.textMuted}
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, carregando && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={carregando}
          >
            <Text style={styles.btnText}>
              {carregando ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Cadastrar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setModo(modo === 'login' ? 'cadastro' : 'login')}>
            <Text style={styles.toggleText}>
              {modo === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  logoArea: { alignItems: 'center', marginBottom: Spacing.xxl },
  logo: { fontSize: 48, fontWeight: '800', color: Colors.textPrimary },
  tagline: { fontSize: Typography.fontSize.md, color: Colors.textSecondary, marginTop: Spacing.sm },
  form: { gap: Spacing.md },
  input: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.md,
    padding: Spacing.md, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.cardBorder,
    fontSize: Typography.fontSize.md,
  },
  btn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center',
  },
  btnText: { color: Colors.white, fontSize: Typography.fontSize.lg, fontWeight: '700' },
  toggleText: { textAlign: 'center', color: Colors.primary, fontSize: Typography.fontSize.sm },
});
