import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOpenFinance } from '../../context/OpenFinanceContext';
import {
  OpenFinanceConnection,
  OpenFinanceInstitutionOption,
  maskDocumentNumber,
  normalizeDocumentNumber,
} from '../../modules/openFinance/domain/openFinanceTypes';

function formatDate(value: unknown): string {
  const maybeDate =
    typeof value === 'object' && value && 'toDate' in (value as any)
      ? (value as any).toDate()
      : value instanceof Date
        ? value
        : typeof value === 'string'
          ? new Date(value)
          : null;

  if (!maybeDate || Number.isNaN(maybeDate.getTime())) return 'Ainda não sincronizado';

  return maybeDate.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusLabel(status: OpenFinanceConnection['status']): string {
  const labels: Record<OpenFinanceConnection['status'], string> = {
    pending: 'Processando conexão',
    awaiting_consent: 'Aguardando consentimento',
    connected: 'Conectado',
    syncing: 'Sincronizando',
    error: 'Erro',
    disconnect_requested: 'Desconexão solicitada',
    disconnected: 'Desconectado',
  };

  return labels[status];
}

function getStatusColor(status: OpenFinanceConnection['status']): string {
  const colors: Record<OpenFinanceConnection['status'], string> = {
    pending: '#FFB830',
    awaiting_consent: '#6C63FF',
    connected: '#00D4AA',
    syncing: '#6C63FF',
    error: '#FF5C5C',
    disconnect_requested: '#FF8C42',
    disconnected: '#5A5A80',
  };

  return colors[status];
}

function InstitutionCard({
  institution,
  onPress,
}: {
  institution: OpenFinanceInstitutionOption;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.institutionCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.institutionIcon, { backgroundColor: `${institution.color}22` }]}>
        <Ionicons name={institution.icon as any} size={18} color={institution.color} />
      </View>
      <Text style={styles.institutionName}>{institution.name}</Text>
    </TouchableOpacity>
  );
}

function ConnectionCard({
  connection,
  onSync,
  onDisconnect,
  onOpenConsent,
}: {
  connection: OpenFinanceConnection;
  onSync: () => void;
  onDisconnect: () => void;
  onOpenConsent: () => void;
}) {
  const badgeColor = getStatusColor(connection.status);

  return (
    <View style={styles.connectionCard}>
      <View style={styles.connectionHeader}>
        <View>
          <Text style={styles.connectionTitle}>{connection.institutionName}</Text>
          <Text style={styles.connectionMeta}>Provider: {connection.provider}</Text>
        </View>
        <View style={[styles.connectionBadge, { backgroundColor: `${badgeColor}22`, borderColor: `${badgeColor}44` }]}>
          <Text style={[styles.connectionBadgeText, { color: badgeColor }]}>{getStatusLabel(connection.status)}</Text>
        </View>
      </View>

      <Text style={styles.connectionInfo}>Última sincronização: {formatDate(connection.lastSyncAt)}</Text>
      {connection.maskedDocument ? <Text style={styles.connectionInfo}>Documento protegido: {connection.maskedDocument}</Text> : null}
      {typeof connection.accountsCount === 'number' ? <Text style={styles.connectionInfo}>Contas sincronizadas: {connection.accountsCount}</Text> : null}
      {connection.errorMessage ? <Text style={styles.connectionError}>{connection.errorMessage}</Text> : null}

      <View style={styles.connectionActions}>
        {connection.consentUrl && connection.status === 'awaiting_consent' ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={onOpenConsent} activeOpacity={0.85}>
            <Ionicons name="open-outline" size={15} color="#6C63FF" />
            <Text style={[styles.secondaryButtonText, { color: '#6C63FF' }]}>Abrir consentimento</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.secondaryButton} onPress={onSync} activeOpacity={0.85}>
          <Ionicons name="sync-outline" size={15} color="#00D4AA" />
          <Text style={[styles.secondaryButtonText, { color: '#00D4AA' }]}>Sincronizar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onDisconnect} activeOpacity={0.85}>
          <Ionicons name="unlink-outline" size={15} color="#FFB830" />
          <Text style={[styles.secondaryButtonText, { color: '#FFB830' }]}>Desconectar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function OpenFinanceScreen({ navigation }: any) {
  const { institutions, connections, loading, connectInstitution, syncConnection, disconnectConnection } = useOpenFinance();
  const [selectedInstitution, setSelectedInstitution] = useState<OpenFinanceInstitutionOption | null>(null);
  const [documentNumber, setDocumentNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const availableInstitutions = useMemo(() => {
    const activeKeys = new Set(
      connections
        .filter((item) => item.status !== 'disconnected' && item.status !== 'disconnect_requested')
        .map((item) => item.institutionKey)
    );
    return institutions.filter((institution) => !activeKeys.has(institution.key));
  }, [connections, institutions]);

  async function handleConnect() {
    if (!selectedInstitution) return;
    const normalizedDocument = normalizeDocumentNumber(documentNumber);

    if (normalizedDocument.length !== 11 && normalizedDocument.length !== 14) {
      Alert.alert('Documento inválido', 'Informe um CPF ou CNPJ válido para iniciar a conexão segura.');
      return;
    }

    setSubmitting(true);
    try {
      await connectInstitution(selectedInstitution, normalizedDocument);
      const maskedDocument = maskDocumentNumber(normalizedDocument);
      setSelectedInstitution(null);
      setDocumentNumber('');
      Alert.alert(
        'Solicitação enviada',
        `A conexão foi registrada com documento ${maskedDocument}. O backend seguro vai criar a sessão de consentimento e devolver o link nesta tela.`
      );
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível solicitar a conexão.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSync(connection: OpenFinanceConnection) {
    try {
      await syncConnection(connection.id);
      Alert.alert('Sincronização solicitada', `A sincronização de ${connection.institutionName} foi enviada para processamento seguro.`);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível solicitar a sincronização.');
    }
  }

  async function handleDisconnect(connection: OpenFinanceConnection) {
    try {
      await disconnectConnection(connection.id);
      Alert.alert('Desconexão solicitada', `A desconexão de ${connection.institutionName} foi marcada para processamento seguro.`);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível solicitar a desconexão.');
    }
  }

  async function handleOpenConsent(connection: OpenFinanceConnection) {
    if (!connection.consentUrl) {
      Alert.alert('Consentimento indisponível', 'Ainda não existe um link pronto para esta conexão.');
      return;
    }

    const canOpen = await Linking.canOpenURL(connection.consentUrl);
    if (!canOpen) {
      Alert.alert('Não foi possível abrir', 'O dispositivo não conseguiu abrir o fluxo de consentimento.');
      return;
    }

    await Linking.openURL(connection.consentUrl);
  }

  function closeModal() {
    setSelectedInstitution(null);
    setDocumentNumber('');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />

      <Modal visible={!!selectedInstitution} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Conectar instituição</Text>
            <Text style={styles.modalText}>
              O app nunca fala direto com o banco. Esta solicitação vai para um backend seguro, que cria a conexão Pluggy e devolve o consentimento por link.
            </Text>
            <View style={styles.selectedInstitutionRow}>
              <View style={[styles.institutionIcon, { backgroundColor: `${selectedInstitution?.color ?? '#6C63FF'}22` }]}>
                <Ionicons name={(selectedInstitution?.icon ?? 'business-outline') as any} size={18} color={selectedInstitution?.color ?? '#6C63FF'} />
              </View>
              <Text style={styles.selectedInstitutionName}>{selectedInstitution?.name}</Text>
            </View>
            <Text style={styles.inputLabel}>CPF ou CNPJ</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite somente números"
              placeholderTextColor="#5C5C7C"
              keyboardType="numeric"
              value={documentNumber}
              onChangeText={setDocumentNumber}
              maxLength={18}
            />
            <Text style={styles.modalHint}>
              O documento fica disponível só pelo tempo necessário para criar a sessão de consentimento e depois é removido da solicitação.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.secondaryButton} onPress={closeModal}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, submitting && { opacity: 0.6 }]}
                onPress={handleConnect}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Solicitar conexão</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color="#9090BB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Open Finance</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Integrações bancárias seguras</Text>
          <Text style={styles.heroText}>
            Arquitetura pronta para provedor real, backend seguro e sincronização de saldos e transações sem expor segredos no app.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>BANCOS DISPONÍVEIS</Text>
        <View style={styles.institutionsGrid}>
          {availableInstitutions.map((institution) => (
            <InstitutionCard
              key={institution.key}
              institution={institution}
              onPress={() => setSelectedInstitution(institution)}
            />
          ))}
          {availableInstitutions.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={30} color="#00D4AA" />
              <Text style={styles.emptyText}>Todas as instituições desta lista já foram solicitadas.</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>CONEXÕES</Text>
        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color="#6C63FF" />
            <Text style={styles.emptyText}>Carregando conexões...</Text>
          </View>
        ) : connections.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cloud-offline-outline" size={30} color="#5A5A80" />
            <Text style={styles.emptyText}>Nenhuma conexão Open Finance cadastrada ainda.</Text>
          </View>
        ) : (
          <View style={styles.connectionsList}>
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onOpenConsent={() => handleOpenConsent(connection)}
                onSync={() => handleSync(connection)}
                onDisconnect={() => handleDisconnect(connection)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F1A' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#252545',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#F0F0FF' },
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 18,
    backgroundColor: '#1E0F45',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6C63FF44',
    padding: 20,
  },
  heroTitle: { fontSize: 18, fontWeight: '700', color: '#F0F0FF', marginBottom: 8 },
  heroText: { fontSize: 13, lineHeight: 20, color: '#B8B8D8' },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3A3A5A',
    letterSpacing: 1.2,
    marginHorizontal: 20,
    marginBottom: 10,
    marginTop: 6,
  },
  institutionsGrid: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 18,
  },
  institutionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#141428',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252545',
    padding: 16,
  },
  institutionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  institutionName: { fontSize: 14, fontWeight: '600', color: '#F0F0FF' },
  connectionsList: { paddingHorizontal: 16, gap: 10 },
  connectionCard: {
    backgroundColor: '#141428',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#252545',
    padding: 16,
    gap: 12,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  connectionTitle: { fontSize: 15, fontWeight: '700', color: '#F0F0FF' },
  connectionMeta: { fontSize: 11, color: '#7A7AA2', marginTop: 3 },
  connectionBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  connectionBadgeText: { fontSize: 10, fontWeight: '700' },
  connectionInfo: { fontSize: 12, color: '#B8B8D8' },
  connectionError: { fontSize: 12, color: '#FF8080' },
  connectionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emptyCard: {
    marginHorizontal: 16,
    backgroundColor: '#141428',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#252545',
    alignItems: 'center',
    padding: 24,
    gap: 10,
  },
  emptyText: { fontSize: 13, color: '#7A7AA2', textAlign: 'center', lineHeight: 18 },
  modalBox: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#252545',
    padding: 24,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#F0F0FF', marginBottom: 12 },
  modalText: { fontSize: 13, lineHeight: 20, color: '#B8B8D8', marginBottom: 16 },
  selectedInstitutionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  selectedInstitutionName: { fontSize: 14, fontWeight: '600', color: '#F0F0FF' },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#7A7AA2', marginBottom: 8, letterSpacing: 0.6 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252545',
    backgroundColor: '#0F0F1A',
    color: '#F0F0FF',
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 10,
  },
  modalHint: { fontSize: 11, lineHeight: 17, color: '#7A7AA2', marginBottom: 18 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#0F0F1A',
    borderWidth: 1,
    borderColor: '#252545',
  },
  secondaryButtonText: { fontSize: 12, fontWeight: '600', color: '#9090BB' },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#6C63FF',
  },
  primaryButtonText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
