// src/screens/Auth/LoginScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [modo, setModo] = useState<'login' | 'cadastro'>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !senha.trim()) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.');
      return;
    }
    setCarregando(true);
    try {
      if (modo === 'login') {
        await signIn(email.trim(), senha);
      } else {
        await signUp(email.trim(), senha);
      }
    } catch (e: any) {
      const mensagens: Record<string, string> = {
        'auth/user-not-found': 'Usuário não encontrado.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/email-already-in-use': 'E-mail já cadastrado.',
        'auth/weak-password': 'Senha muito fraca. Use ao menos 6 caracteres.',
        'auth/invalid-email': 'E-mail inválido.',
      };
      Alert.alert('Erro', mensagens[e.code] ?? 'Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="time-outline" size={28} color="#6C63FF" />
            </View>
            <Text style={styles.logoText}>Kipo</Text>
            <Text style={styles.tagline}>Seu dinheiro, sob controle</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, modo === 'login' && styles.toggleBtnActive]}
                onPress={() => setModo('login')}
                activeOpacity={0.8}
              >
                {modo === 'login' ? (
                  <View style={styles.toggleGradient}>
                    <Text style={styles.toggleTextActive}>Entrar</Text>
                  </View>
                ) : (
                  <Text style={styles.toggleTextInactive}>Entrar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, modo === 'cadastro' && styles.toggleBtnActive]}
                onPress={() => setModo('cadastro')}
                activeOpacity={0.8}
              >
                {modo === 'cadastro' ? (
                  <View style={styles.toggleGradient}>
                    <Text style={styles.toggleTextActive}>Cadastrar</Text>
                  </View>
                ) : (
                  <Text style={styles.toggleTextInactive}>Cadastrar</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={16} color="#5A5A80" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-mail"
                placeholderTextColor="#5A5A80"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={[styles.inputContainer, styles.inputContainerFocused]}>
              <Ionicons name="lock-closed-outline" size={16} color="#6C63FF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#5A5A80"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!senhaVisivel}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setSenhaVisivel(!senhaVisivel)}>
                <Ionicons
                  name={senhaVisivel ? 'eye-outline' : 'eye-off-outline'}
                  size={16}
                  color="#5A5A80"
                />
              </TouchableOpacity>
            </View>

            {modo === 'login' && (
              <TouchableOpacity style={styles.esqueciBtn}>
                <Text style={styles.esqueciText}>Esqueci a senha</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={carregando}
              activeOpacity={0.85}
              style={[styles.submitBtn, carregando && { opacity: 0.6 }]}
            >
              <Text style={styles.submitText}>
                {carregando ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divisor}>
              <View style={styles.divisorLine} />
              <Text style={styles.divisorText}>ou</Text>
              <View style={styles.divisorLine} />
            </View>

            <TouchableOpacity style={styles.googleBtn} activeOpacity={0.8}>
              <Ionicons name="logo-google" size={16} color="#9090BB" />
              <Text style={styles.googleText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModo(modo === 'login' ? 'cadastro' : 'login')}>
              <Text style={styles.alternarText}>
                {modo === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
                <Text style={styles.alternarLink}>
                  {modo === 'login' ? 'Cadastre-se' : 'Entrar'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F1A' },
  scroll: { flexGrow: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 48,
    alignItems: 'center',
    backgroundColor: '#1A0F3A',
  },
  logoContainer: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#1A1A2E',
    borderWidth: 1, borderColor: '#6C63FF33',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  logoText: { fontSize: 28, fontWeight: '700', color: '#F0F0FF', letterSpacing: -0.5, marginBottom: 8 },
  tagline: { fontSize: 13, color: '#5A5A80' },
  form: { flex: 1, padding: 28, gap: 12 },
  toggle: {
    flexDirection: 'row', backgroundColor: '#1A1A2E',
    borderRadius: 14, padding: 4, marginBottom: 8,
  },
  toggleBtn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  toggleBtnActive: {},
  toggleGradient: {
    paddingVertical: 10, alignItems: 'center',
    borderRadius: 10, backgroundColor: '#6C63FF',
  },
  toggleTextActive: { fontSize: 13, fontWeight: '600', color: '#fff' },
  toggleTextInactive: { fontSize: 13, color: '#5A5A80', textAlign: 'center', paddingVertical: 10 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#141428', borderRadius: 12,
    borderWidth: 1, borderColor: '#252545',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
  },
  inputContainerFocused: { borderColor: '#6C63FF33' },
  inputIcon: { width: 16 },
  input: { flex: 1, fontSize: 14, color: '#F0F0FF', padding: 0 },
  esqueciBtn: { alignSelf: 'flex-end', paddingVertical: 2 },
  esqueciText: { fontSize: 12, color: '#6C63FF99' },
  submitBtn: {
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', backgroundColor: '#6C63FF', marginTop: 8,
  },
  submitText: { fontSize: 15, fontWeight: '600', color: '#fff', letterSpacing: 0.2 },
  divisor: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  divisorLine: { flex: 1, height: 1, backgroundColor: '#1E1E38' },
  divisorText: { fontSize: 11, color: '#3A3A5A' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#141428', borderRadius: 12,
    borderWidth: 1, borderColor: '#252545', paddingVertical: 13,
  },
  googleText: { fontSize: 13, color: '#6060A0' },
  alternarText: { textAlign: 'center', fontSize: 12, color: '#3A3A5A', marginTop: 4 },
  alternarLink: { color: '#6C63FF' },
});