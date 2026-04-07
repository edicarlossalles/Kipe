// src/screens/Profile/ProfileScreen.tsx
//
// Tela de perfil: exibe dados do usuário, permite editar nome e senha,
// gerenciar preferências de tema e fazer logout.

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
  TextInput, Alert, Switch, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  updateProfile, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential,
} from 'firebase/auth';
import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../services/firebase/config';
import { useAuth } from '../../context/AuthContext';

// ─── helpers ────────────────────────────────────────────────────────────────

function gerarIniciais(nome: string | null): string {
  if (!nome) return 'KP';
  return nome
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

// ─── sub-componentes ─────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>;
}

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function ActionModal({
  visible,
  title,
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  onClose,
  cancelLabel = 'Cancelar',
  hideCancel = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: string;
  onConfirm: () => void;
  onClose: () => void;
  cancelLabel?: string;
  hideCancel?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitulo}>{title}</Text>
          <Text style={styles.modalMensagem}>{message}</Text>
          <View style={styles.modalBtns}>
            {!hideCancel && (
              <TouchableOpacity style={styles.btnCancelar} onPress={onClose}>
                <Text style={styles.btnCancelarTexto}>{cancelLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.btnSalvar,
                hideCancel && styles.btnSalvarFull,
                confirmColor ? { backgroundColor: confirmColor } : null,
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.btnSalvarTexto}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RowItem({
  icone, cor, label, valor, onPress, isSwitch, switchValue, onSwitchChange,
}: {
  icone: string; cor: string; label: string; valor?: string;
  onPress?: () => void; isSwitch?: boolean;
  switchValue?: boolean; onSwitchChange?: (v: boolean) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.rowItem}
      onPress={onPress}
      activeOpacity={isSwitch ? 1 : 0.7}
      disabled={isSwitch}
    >
      <View style={[styles.rowIconBox, { backgroundColor: cor + '22' }]}>
        <Ionicons name={icone as any} size={15} color={cor} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {isSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: '#252545', true: '#6C63FF' }}
            thumbColor="#fff"
          />
        ) : (
          <>
            {valor ? <Text style={styles.rowValor}>{valor}</Text> : null}
            <Ionicons name="chevron-forward" size={14} color="#3A3A5A" />
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── modal de edição de nome ─────────────────────────────────────────────────

function ModalEditarNome({
  nomeAtual,
  onSalvar,
  onCancelar,
}: {
  nomeAtual: string;
  onSalvar: (novo: string) => Promise<void>;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState(nomeAtual);
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      await onSalvar(nome.trim());
    } finally {
      setSalvando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.modalOverlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.modalBox}>
        <Text style={styles.modalTitulo}>Editar nome</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Seu nome"
          placeholderTextColor="#3A3A5A"
          autoFocus
        />
        <View style={styles.modalBtns}>
          <TouchableOpacity style={styles.btnCancelar} onPress={onCancelar}>
            <Text style={styles.btnCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnSalvar, salvando && { opacity: 0.6 }]}
            onPress={handleSalvar}
            disabled={salvando}
          >
            {salvando
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.btnSalvarTexto}>Salvar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function ModalEditarFoto({
  fotoAtual,
  onSalvar,
  onCancelar,
}: {
  fotoAtual: string;
  onSalvar: (url: string) => Promise<void>;
  onCancelar: () => void;
}) {
  const [url, setUrl] = useState(fotoAtual);
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    setSalvando(true);
    try {
      await onSalvar(url.trim());
    } finally {
      setSalvando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.modalOverlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.modalBox}>
        <Text style={styles.modalTitulo}>Foto de perfil</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="Cole a URL da foto"
          placeholderTextColor="#3A3A5A"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        <Text style={styles.inputHint}>
          A seleção pela galeria do dispositivo precisa do pacote `expo-image-picker`, que ainda não está instalado neste projeto.
        </Text>
        <View style={styles.modalBtns}>
          <TouchableOpacity style={styles.btnCancelar} onPress={onCancelar}>
            <Text style={styles.btnCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnSalvar, salvando && { opacity: 0.6 }]}
            onPress={handleSalvar}
            disabled={salvando}
          >
            {salvando
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.btnSalvarTexto}>Salvar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── modal de alteração de senha ─────────────────────────────────────────────

function ModalAlterarSenha({
  onSalvar,
  onCancelar,
}: {
  onSalvar: (senhaAtual: string, novaSenha: string) => Promise<void>;
  onCancelar: () => void;
}) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mostrarAtual, setMostrarAtual] = useState(false);
  const [mostrarNova, setMostrarNova] = useState(false);

  async function handleSalvar() {
    if (!senhaAtual || !novaSenha || !confirmar) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    if (novaSenha !== confirmar) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }
    if (novaSenha.length < 6) {
      Alert.alert('Atenção', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar(senhaAtual, novaSenha);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.modalOverlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.modalBox}>
        <Text style={styles.modalTitulo}>Alterar senha</Text>

        <Text style={styles.inputLabel}>Senha atual</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={senhaAtual}
            onChangeText={setSenhaAtual}
            placeholder="••••••••"
            placeholderTextColor="#3A3A5A"
            secureTextEntry={!mostrarAtual}
          />
          <TouchableOpacity onPress={() => setMostrarAtual(v => !v)} style={styles.olhoBtn}>
            <Ionicons name={mostrarAtual ? 'eye-off-outline' : 'eye-outline'} size={16} color="#5A5A80" />
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>Nova senha</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={novaSenha}
            onChangeText={setNovaSenha}
            placeholder="••••••••"
            placeholderTextColor="#3A3A5A"
            secureTextEntry={!mostrarNova}
          />
          <TouchableOpacity onPress={() => setMostrarNova(v => !v)} style={styles.olhoBtn}>
            <Ionicons name={mostrarNova ? 'eye-off-outline' : 'eye-outline'} size={16} color="#5A5A80" />
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>Confirmar nova senha</Text>
        <TextInput
          style={styles.input}
          value={confirmar}
          onChangeText={setConfirmar}
          placeholder="••••••••"
          placeholderTextColor="#3A3A5A"
          secureTextEntry
        />

        <View style={styles.modalBtns}>
          <TouchableOpacity style={styles.btnCancelar} onPress={onCancelar}>
            <Text style={styles.btnCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnSalvar, salvando && { opacity: 0.6 }]}
            onPress={handleSalvar}
            disabled={salvando}
          >
            {salvando
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.btnSalvarTexto}>Salvar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── tela principal ───────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }: any) {
  const { user, signOut } = useAuth();

  const [modalNome, setModalNome] = useState(false);
  const [modalFoto, setModalFoto] = useState(false);
  const [modalSenha, setModalSenha] = useState(false);
  const [notificacoes, setNotificacoes] = useState(true);
  const [modoEscuro, setModoEscuro] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [modalSyncOk, setModalSyncOk] = useState(false);
  const [modalResetConfirm, setModalResetConfirm] = useState(false);
  const [modalResetOk, setModalResetOk] = useState(false);

  const iniciais = gerarIniciais(user?.displayName ?? null);
  const nomeAtual = user?.displayName ?? 'Usuário';
  const email = user?.email ?? '';
  const fotoAtual = user?.photoURL ?? '';

  // ── ações ──────────────────────────────────────────────────────────────────

  async function salvarNome(novo: string) {
    try {
      if (!auth.currentUser) return;
      await updateProfile(auth.currentUser, { displayName: novo });
      setModalNome(false);
      Alert.alert('Sucesso', 'Nome atualizado!');
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível atualizar o nome.');
    }
  }

  async function salvarFoto(url: string) {
    try {
      if (!auth.currentUser) return;
      await updateProfile(auth.currentUser, { photoURL: url || null });
      setModalFoto(false);
      Alert.alert('Sucesso', 'Foto atualizada!');
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível atualizar a foto.');
    }
  }

  async function salvarSenha(senhaAtual: string, novaSenha: string) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) return;

      // Reautentica antes de alterar a senha
      const credencial = EmailAuthProvider.credential(currentUser.email, senhaAtual);
      await reauthenticateWithCredential(currentUser, credencial);
      await updatePassword(currentUser, novaSenha);

      setModalSenha(false);
      Alert.alert('Sucesso', 'Senha alterada com sucesso!');
    } catch (e: any) {
      if (e.code === 'auth/wrong-password') {
        Alert.alert('Erro', 'Senha atual incorreta.');
      } else {
        Alert.alert('Erro', e.message ?? 'Não foi possível alterar a senha.');
      }
    }
  }

  function confirmarLogout() {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: signOut },
      ]
    );
  }

  async function sincronizarAgora() {
    try {
      setSincronizando(true);
      if (auth.currentUser) {
        await auth.currentUser.reload();
      }
      setModalSyncOk(true);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível sincronizar agora.');
    } finally {
      setSincronizando(false);
    }
  }

  async function resetarDados() {
    if (!user) return;

    try {
      const colecoes = [
        'transacoes_kipo',
        'metas_kipo',
        'categorias_kipo',
        'contas_kipo',
      ];

      for (const nomeColecao of colecoes) {
        const consulta = query(collection(db, nomeColecao), where('uid', '==', user.uid));
        const snapshot = await getDocs(consulta);
        if (snapshot.empty) continue;

        const batch = writeBatch(db);
        snapshot.docs.forEach((item) => batch.delete(item.ref));
        await batch.commit();
      }

      setModalResetOk(true);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível resetar os dados.');
    }
  }

  function confirmarResetDados() {
    setModalResetConfirm(true);
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />

      <ActionModal
        visible={modalSyncOk}
        title="Sincronização concluída"
        message="Os dados visíveis da sua conta foram sincronizados com o Firebase."
        confirmLabel="Fechar"
        onConfirm={() => setModalSyncOk(false)}
        onClose={() => setModalSyncOk(false)}
        hideCancel
      />

      <ActionModal
        visible={modalResetConfirm}
        title="Resetar dados"
        message="Essa ação apaga transações, metas, categorias e contas. Ela não pode ser desfeita."
        confirmLabel="Resetar"
        confirmColor="#FFB830"
        onConfirm={() => {
          setModalResetConfirm(false);
          resetarDados();
        }}
        onClose={() => setModalResetConfirm(false)}
      />

      <ActionModal
        visible={modalResetOk}
        title="Dados resetados"
        message="Seus dados financeiros foram apagados com sucesso."
        confirmLabel="Fechar"
        onConfirm={() => setModalResetOk(false)}
        onClose={() => setModalResetOk(false)}
        hideCancel
      />

      {/* Modais */}
      {modalNome && (
        <ModalEditarNome
          nomeAtual={nomeAtual}
          onSalvar={salvarNome}
          onCancelar={() => setModalNome(false)}
        />
      )}
      {modalFoto && (
        <ModalEditarFoto
          fotoAtual={fotoAtual}
          onSalvar={salvarFoto}
          onCancelar={() => setModalFoto(false)}
        />
      )}
      {modalSenha && (
        <ModalAlterarSenha
          onSalvar={salvarSenha}
          onCancelar={() => setModalSenha(false)}
        />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#9090BB" />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Perfil</Text>
          <View style={{ width: 34 }} />
        </View>

        {/* Avatar + nome */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarCircle} onPress={() => setModalFoto(true)} activeOpacity={0.85}>
            {fotoAtual ? (
              <Image source={{ uri: fotoAtual }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{iniciais}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalFoto(true)} activeOpacity={0.8}>
            <Text style={styles.alterarFotoTexto}>{fotoAtual ? 'Alterar foto' : 'Adicionar foto'}</Text>
          </TouchableOpacity>
          <Text style={styles.nomeTexto}>{nomeAtual}</Text>
          <Text style={styles.emailTexto}>{email}</Text>
        </View>

        {/* Seção: Conta */}
        <SectionTitle label="CONTA" />
        <SectionCard>
          <RowItem
            icone="person-outline"
            cor="#6C63FF"
            label="Nome"
            valor={nomeAtual}
            onPress={() => setModalNome(true)}
          />
          <View style={styles.divisor} />
          <RowItem
            icone="image-outline"
            cor="#9090BB"
            label="Foto de perfil"
            valor={fotoAtual ? 'Configurada' : 'Adicionar'}
            onPress={() => setModalFoto(true)}
          />
          <View style={styles.divisor} />
          <RowItem
            icone="mail-outline"
            cor="#00D4AA"
            label="E-mail"
            valor={email}
          />
          <View style={styles.divisor} />
          <RowItem
            icone="lock-closed-outline"
            cor="#FFB830"
            label="Alterar senha"
            onPress={() => setModalSenha(true)}
          />
        </SectionCard>

        {/* Seção: Preferências */}
        <SectionTitle label="PREFERÊNCIAS" />
        <SectionCard>
          <RowItem
            icone="notifications-outline"
            cor="#6C63FF"
            label="Notificações"
            isSwitch
            switchValue={notificacoes}
            onSwitchChange={setNotificacoes}
          />
          <View style={styles.divisor} />
          <RowItem
            icone="moon-outline"
            cor="#9090BB"
            label="Modo escuro"
            isSwitch
            switchValue={modoEscuro}
            onSwitchChange={setModoEscuro}
          />
          <View style={styles.divisor} />
          <RowItem
            icone="sync-outline"
            cor="#00D4AA"
            label="Sincronizar agora"
            valor={sincronizando ? 'Sincronizando...' : 'Firebase'}
            onPress={sincronizarAgora}
          />
          <View style={styles.divisor} />
          <RowItem
            icone="business-outline"
            cor="#6C63FF"
            label="Open Finance"
            valor="Bancos conectados"
            onPress={() => navigation.navigate('OpenFinance')}
          />
        </SectionCard>

        {/* Seção: Sessão */}
        <SectionTitle label="SESSÃO" />
        <SectionCard>
          <TouchableOpacity style={styles.logoutBtn} onPress={confirmarLogout} activeOpacity={0.75}>
            <View style={[styles.rowIconBox, { backgroundColor: '#FF5C5C22' }]}>
              <Ionicons name="log-out-outline" size={15} color="#FF5C5C" />
            </View>
            <Text style={styles.logoutTexto}>Sair da conta</Text>
          </TouchableOpacity>
          <View style={styles.divisor} />
          <TouchableOpacity style={styles.logoutBtn} onPress={confirmarResetDados} activeOpacity={0.75}>
            <View style={[styles.rowIconBox, { backgroundColor: '#FFB83022' }]}>
              <Ionicons name="refresh-circle-outline" size={15} color="#FFB830" />
            </View>
            <Text style={styles.resetTexto}>Resetar dados</Text>
          </TouchableOpacity>
        </SectionCard>

        <Text style={styles.versao}>Kipo v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F1A' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#1A1A2E',
    borderWidth: 1, borderColor: '#252545',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitulo: { fontSize: 15, fontWeight: '700', color: '#F0F0FF' },

  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#6C63FF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 36 },
  avatarText: { fontSize: 26, fontWeight: '700', color: '#fff' },
  alterarFotoTexto: { fontSize: 12, color: '#6C63FF', fontWeight: '600' },
  nomeTexto: { fontSize: 18, fontWeight: '700', color: '#F0F0FF' },
  emailTexto: { fontSize: 12, color: '#5A5A80' },

  sectionTitle: {
    fontSize: 10, fontWeight: '700', color: '#3A3A5A',
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginHorizontal: 20, marginBottom: 8, marginTop: 20,
  },

  sectionCard: {
    marginHorizontal: 16,
    backgroundColor: '#141428',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#252545',
    overflow: 'hidden',
  },

  rowItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowIconBox: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  rowLabel: { flex: 1, fontSize: 13, color: '#D0D0F0' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValor: { fontSize: 12, color: '#5A5A80', maxWidth: 140 },

  divisor: { height: 1, backgroundColor: '#1E1E38', marginHorizontal: 16 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  logoutTexto: { fontSize: 13, color: '#FF5C5C', fontWeight: '600' },
  resetTexto: { fontSize: 13, color: '#FFB830', fontWeight: '600' },

  versao: {
    textAlign: 'center', fontSize: 10, color: '#2A2A45',
    marginTop: 28, marginBottom: 40,
  },

  // Modal
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#00000088',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 100, padding: 24,
  },
  modalBox: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1, borderColor: '#252545',
    padding: 24, width: '100%',
  },
  modalTitulo: {
    fontSize: 15, fontWeight: '700', color: '#F0F0FF',
    marginBottom: 20,
  },
  modalMensagem: {
    fontSize: 13,
    color: '#B8B8D8',
    lineHeight: 20,
    marginBottom: 4,
  },
  inputLabel: { fontSize: 11, color: '#5A5A80', marginBottom: 6, marginTop: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    backgroundColor: '#0F0F1A',
    borderWidth: 1, borderColor: '#252545',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 13, color: '#F0F0FF', marginBottom: 12,
  },
  inputHint: { fontSize: 11, color: '#7A7AA2', lineHeight: 16, marginBottom: 4 },
  olhoBtn: { padding: 12 },
  modalBtns: {
    flexDirection: 'row', gap: 10, marginTop: 8,
  },
  btnCancelar: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: '#0F0F1A',
    borderWidth: 1, borderColor: '#252545',
    alignItems: 'center',
  },
  btnCancelarTexto: { fontSize: 13, color: '#5A5A80', fontWeight: '600' },
  btnSalvar: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: '#6C63FF', alignItems: 'center',
  },
  btnSalvarFull: {
    flex: 0,
    minWidth: 140,
    alignSelf: 'center',
    paddingHorizontal: 22,
  },
  btnSalvarTexto: { fontSize: 13, color: '#fff', fontWeight: '700' },
});
