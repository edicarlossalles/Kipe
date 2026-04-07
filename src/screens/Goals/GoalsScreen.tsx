// src/screens/Goals/GoalsScreen.tsx
//
// Tela de Metas: criação e acompanhamento de metas financeiras.
// Tipos: economia, gasto máximo por categoria e saldo mínimo.
// Progresso com prazo, valor guardado por mês e barra de progresso.

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Modal, TextInput, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, addDoc, onSnapshot, query,
  where, deleteDoc, doc, updateDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { format, differenceInDays, differenceInMonths, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── tipos ───────────────────────────────────────────────────────────────────

type TipoMeta = 'economia' | 'gasto_maximo' | 'saldo_minimo' | 'divida_atrasada';

type ModalidadeDivida = 'avista' | 'parcelado';

interface ParcelaDivida {
  id: string;
  numero: number;
  valor: number;
  dataPrevista?: string;
  paga: boolean;
  dataPagamento?: string;
}

interface Meta {
  id: string;
  uid: string;
  nome: string;
  tipo: TipoMeta;
  valorAlvo: number;       // em centavos
  valorAtual: number;      // em centavos (para economia: quanto já guardou)
  prazo: string;           // ISO date string
  categoria?: string;      // para gasto_maximo
  cor: string;
  icone: string;
  concluida: boolean;
  modalidadeDivida?: ModalidadeDivida;
  parcelas?: ParcelaDivida[];
  dataPagamentoAvista?: string;
}

// ─── constantes ──────────────────────────────────────────────────────────────

const TIPOS_META = [
  {
    key: 'economia' as TipoMeta,
    label: 'Economia',
    descricao: 'Juntar um valor específico',
    icone: 'trending-up-outline',
    cor: '#00D4AA',
  },
  {
    key: 'gasto_maximo' as TipoMeta,
    label: 'Gasto máximo',
    descricao: 'Limitar gastos de uma categoria',
    icone: 'shield-outline',
    cor: '#FFB830',
  },
  {
    key: 'saldo_minimo' as TipoMeta,
    label: 'Saldo mínimo',
    descricao: 'Manter saldo acima de um valor',
    icone: 'wallet-outline',
    cor: '#6C63FF',
  },
  {
    key: 'divida_atrasada' as TipoMeta,
    label: 'Dívida atrasada',
    descricao: 'Quitar dívida fora das despesas principais',
    icone: 'alert-circle-outline',
    cor: '#FF8C42',
  },
];

const ICONES = [
  'home-outline', 'car-outline', 'airplane-outline', 'school-outline',
  'heart-outline', 'gift-outline', 'phone-portrait-outline', 'laptop-outline',
  'musical-notes-outline', 'barbell-outline', 'restaurant-outline', 'leaf-outline',
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
  return (parseInt(nums, 10) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function parseCentavos(f: string): number {
  return parseInt(f.replace(/\D/g, '') || '0', 10);
}

function formatDateInput(value: string): string {
  const nums = value.replace(/\D/g, '').slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
}

function parseDateInput(value: string): string | null {
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
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function timestampToDate(data: any): Date {
  if (!data) return new Date();
  if (data?.toDate) return data.toDate();
  if (data instanceof Date) return data;
  return new Date(data);
}

function diasRestantes(prazo: string): number {
  return Math.max(0, differenceInDays(new Date(prazo), new Date()));
}

function mesesRestantes(prazo: string): number {
  return Math.max(0, differenceInMonths(new Date(prazo), new Date()));
}

function valorPorMes(valorFaltando: number, prazo: string): number {
  const meses = mesesRestantes(prazo);
  if (meses <= 0) return valorFaltando;
  return Math.ceil(valorFaltando / meses);
}

function infoTipo(tipo: TipoMeta) {
  return TIPOS_META.find(t => t.key === tipo) ?? TIPOS_META[0];
}

function gerarParcelasIniciais(quantidade: number): ParcelaDivida[] {
  return Array.from({ length: quantidade }, (_, index) => ({
    id: `parcela_${index + 1}`,
    numero: index + 1,
    valor: 0,
    dataPrevista: '',
    paga: false,
  }));
}

function somarParcelas(parcelas: ParcelaDivida[]): number {
  return parcelas.reduce((total, parcela) => total + (parcela.valor || 0), 0);
}

function contarParcelasPagas(parcelas: ParcelaDivida[]): number {
  return parcelas.filter(parcela => parcela.paga).length;
}

function calcularPrazoDivida(parcelas: ParcelaDivida[]): string {
  const datas = parcelas
    .map(parcela => parcela.dataPrevista)
    .filter((data): data is string => !!data)
    .sort();

  return datas[datas.length - 1] ?? new Date().toISOString().slice(0, 10);
}

// ─── modal criar meta ─────────────────────────────────────────────────────────

function ModalCriarMeta({
  visible, onClose, onSalvar,
}: {
  visible: boolean;
  onClose: () => void;
  onSalvar: (meta: Omit<Meta, 'id' | 'uid' | 'concluida'>) => Promise<void>;
}) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoMeta>('economia');
  const [valorAlvoRaw, setValorAlvoRaw] = useState('');
  const [valorAtualRaw, setValorAtualRaw] = useState('');
  const [prazo, setPrazo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [cor, setCor] = useState(CORES[0]);
  const [icone, setIcone] = useState(ICONES[0]);
  const [salvando, setSalvando] = useState(false);
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [modalidadeDivida, setModalidadeDivida] = useState<ModalidadeDivida>('avista');
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('2');
  const [parcelas, setParcelas] = useState<ParcelaDivida[]>(gerarParcelasIniciais(2));
  const [dataPagamentoAvista, setDataPagamentoAvista] = useState('');

  function resetar() {
    setNome(''); setTipo('economia'); setValorAlvoRaw('');
    setValorAtualRaw(''); setPrazo(''); setCategoria('');
    setCor(CORES[0]); setIcone(ICONES[0]); setEtapa(1);
    setModalidadeDivida('avista'); setQuantidadeParcelas('2');
    setParcelas(gerarParcelasIniciais(2)); setDataPagamentoAvista('');
  }

  function atualizarQuantidadeParcelas(valor: string) {
    const numeros = valor.replace(/\D/g, '').slice(0, 2);
    setQuantidadeParcelas(numeros);
    const quantidade = Math.max(parseInt(numeros || '0', 10), 0);
    if (quantidade === 0) {
      setParcelas([]);
      return;
    }

    setParcelas(parcelasAtuais =>
      Array.from({ length: quantidade }, (_, index) => parcelasAtuais[index] ?? {
        id: `parcela_${index + 1}`,
        numero: index + 1,
        valor: 0,
        dataPrevista: '',
        paga: false,
      }).map((parcela, index) => ({
        ...parcela,
        numero: index + 1,
      }))
    );
  }

  function atualizarParcela(index: number, campo: 'valor' | 'dataPrevista', valor: string) {
    setParcelas(parcelasAtuais =>
      parcelasAtuais.map((parcela, parcelaIndex) => {
        if (parcelaIndex !== index) {
          return parcela;
        }

        return {
          ...parcela,
          [campo]: campo === 'valor' ? parseCentavos(valor) : valor,
        };
      })
    );
  }

  async function handleSalvar() {
    if (!nome.trim()) { Alert.alert('Atenção', 'Digite um nome para a meta.'); return; }
    if (tipo === 'gasto_maximo' && !categoria.trim()) {
      Alert.alert('Atenção', 'Informe a categoria para limitar.'); return;
    }

    let valorAlvo = parseCentavos(valorAlvoRaw);
    let valorAtual = parseCentavos(valorAtualRaw);
    let prazoFormatado = parseDateInput(prazo);
    let parcelasFormatadas = parcelas;
    let dataPagamentoAvistaFormatada = parseDateInput(dataPagamentoAvista) ?? undefined;

    if (tipo !== 'divida_atrasada') {
      if (!valorAlvoRaw) { Alert.alert('Atenção', 'Digite o valor alvo.'); return; }
      if (!prazoFormatado) { Alert.alert('Atenção', 'Digite o prazo no formato DD/MM/AAAA.'); return; }
    }

    if (tipo === 'divida_atrasada') {
      if (modalidadeDivida === 'avista') {
        if (!valorAlvoRaw) { Alert.alert('Atenção', 'Digite o valor da dívida.'); return; }
        prazoFormatado = dataPagamentoAvistaFormatada ?? new Date().toISOString().slice(0, 10);
        valorAtual = dataPagamentoAvistaFormatada ? valorAlvo : 0;
      } else {
        if (parcelas.length === 0) {
          Alert.alert('Atenção', 'Informe pelo menos uma parcela.');
          return;
        }

        for (const parcela of parcelas) {
          if (parcela.valor <= 0) {
            Alert.alert('Atenção', `Informe um valor válido para a parcela ${parcela.numero}.`);
            return;
          }
          if (parcela.dataPrevista) {
            const dataParcela = parseDateInput(formatDateInput(parcela.dataPrevista));
            if (!dataParcela) {
              Alert.alert('Atenção', `A data da parcela ${parcela.numero} precisa estar no formato DD/MM/AAAA.`);
              return;
            }
          }
        }

        parcelasFormatadas = parcelas.map(parcela => ({
          ...parcela,
          dataPrevista: parcela.dataPrevista ? parseDateInput(formatDateInput(parcela.dataPrevista)) ?? undefined : undefined,
        }));
        valorAlvo = somarParcelas(parcelasFormatadas);
        valorAtual = somarParcelas(parcelasFormatadas.filter(parcela => parcela.paga));
        prazoFormatado = calcularPrazoDivida(parcelasFormatadas);
      }
    }

    setSalvando(true);
    try {
      await onSalvar({
        nome: nome.trim(),
        tipo,
        valorAlvo,
        valorAtual,
        prazo: prazoFormatado!,
        categoria: categoria.trim() || undefined,
        cor,
        icone,
        modalidadeDivida: tipo === 'divida_atrasada' ? modalidadeDivida : undefined,
        parcelas: tipo === 'divida_atrasada' && modalidadeDivida === 'parcelado' ? parcelasFormatadas : undefined,
        dataPagamentoAvista: tipo === 'divida_atrasada' && modalidadeDivida === 'avista' ? dataPagamentoAvistaFormatada : undefined,
      });
      resetar();
      onClose();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível criar a meta.');
    } finally {
      setSalvando(false);
    }
  }

  const infoTipoSel = infoTipo(tipo);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={modal.overlay}>
          <View style={modal.box}>
          <View style={modal.header}>
            <Text style={modal.titulo}>
              {etapa === 1 ? 'Nova meta' : 'Detalhes da meta'}
            </Text>
            <TouchableOpacity onPress={() => { resetar(); onClose(); }}>
              <Ionicons name="close" size={20} color="#5A5A80" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {etapa === 1 ? (
              <>
                {/* Tipo de meta */}
                <Text style={modal.label}>Tipo de meta</Text>
                <View style={modal.tiposGrid}>
                  {TIPOS_META.map(t => (
                    <TouchableOpacity
                      key={t.key}
                      style={[modal.tipoCard, tipo === t.key && { borderColor: t.cor, backgroundColor: t.cor + '18' }]}
                      onPress={() => setTipo(t.key)}
                    >
                      <View style={[modal.tipoIconBox, { backgroundColor: t.cor + '22' }]}>
                        <Ionicons name={t.icone as any} size={18} color={t.cor} />
                      </View>
                      <Text style={[modal.tipoLabel, tipo === t.key && { color: t.cor }]}>{t.label}</Text>
                      <Text style={modal.tipoDesc}>{t.descricao}</Text>
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
                      {cor === c && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={modal.btnProximo} onPress={() => setEtapa(2)}>
                  <Text style={modal.btnProximoTexto}>Próximo</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Nome */}
                <Text style={modal.label}>Nome da meta</Text>
                <TextInput
                  style={modal.input}
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Ex: Viagem, Reserva de emergência..."
                  placeholderTextColor="#3A3A5A"
                  maxLength={40}
                />

                {/* Categoria (só gasto_maximo) */}
                {tipo === 'gasto_maximo' && (
                  <>
                    <Text style={modal.label}>Categoria a limitar</Text>
                    <TextInput
                      style={modal.input}
                      value={categoria}
                      onChangeText={setCategoria}
                      placeholder="Ex: lazer, alimentação..."
                      placeholderTextColor="#3A3A5A"
                    />
                  </>
                )}

                {/* Valor alvo */}
                {(tipo !== 'divida_atrasada' || modalidadeDivida === 'avista') && (
                  <>
                <Text style={modal.label}>
                  {tipo === 'economia' ? 'Valor a juntar' :
                   tipo === 'gasto_maximo' ? 'Limite de gasto' :
                   tipo === 'divida_atrasada' ? 'Valor da dívida' : 'Saldo mínimo'}
                </Text>
                <View style={modal.saldoRow}>
                  <Text style={modal.saldoPrefixo}>R$</Text>
                  <TextInput
                    style={modal.saldoInput}
                    value={valorAlvoRaw}
                    onChangeText={v => setValorAlvoRaw(formatValorInput(v))}
                    placeholder="0,00"
                    placeholderTextColor="#3A3A5A"
                    keyboardType="numeric"
                  />
                </View>
                  </>
                )}

                {tipo === 'divida_atrasada' && (
                  <>
                    <Text style={modal.label}>Forma de pagamento</Text>
                    <View style={modal.opcoesLinha}>
                      {(['avista', 'parcelado'] as ModalidadeDivida[]).map(opcao => (
                        <TouchableOpacity
                          key={opcao}
                          style={[
                            modal.opcaoBtn,
                            modalidadeDivida === opcao && { borderColor: cor, backgroundColor: cor + '18' },
                          ]}
                          onPress={() => setModalidadeDivida(opcao)}
                        >
                          <Text style={[modal.opcaoTexto, modalidadeDivida === opcao && { color: cor }]}>
                            {opcao === 'avista' ? 'À vista' : 'Parcelado'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {modalidadeDivida === 'avista' ? (
                      <>
                        <Text style={modal.label}>Data do pagamento (opcional)</Text>
                        <TextInput
                          style={modal.input}
                          value={dataPagamentoAvista}
                          onChangeText={(v) => setDataPagamentoAvista(formatDateInput(v))}
                          placeholder="Se deixar vazio, registra no dia do pagamento"
                          placeholderTextColor="#3A3A5A"
                          keyboardType="numeric"
                          maxLength={10}
                        />
                      </>
                    ) : (
                      <>
                        <Text style={modal.label}>Número de parcelas</Text>
                        <TextInput
                          style={modal.input}
                          value={quantidadeParcelas}
                          onChangeText={atualizarQuantidadeParcelas}
                          placeholder="Ex: 3"
                          placeholderTextColor="#3A3A5A"
                          keyboardType="numeric"
                          maxLength={2}
                        />

                        {parcelas.map((parcela, index) => (
                          <View key={parcela.id} style={modal.parcelaCard}>
                            <Text style={modal.parcelaTitulo}>Parcela {parcela.numero}</Text>
                            <View style={modal.saldoRow}>
                              <Text style={modal.saldoPrefixo}>R$</Text>
                              <TextInput
                                style={modal.saldoInput}
                                value={parcela.valor ? formatBRL(parcela.valor).replace('R$', '').trim() : ''}
                                onChangeText={v => atualizarParcela(index, 'valor', formatValorInput(v))}
                                placeholder="0,00"
                                placeholderTextColor="#3A3A5A"
                                keyboardType="numeric"
                              />
                            </View>
                            <TextInput
                              style={[modal.input, { marginTop: 10 }]}
                              value={parcela.dataPrevista ? formatDateInput(parcela.dataPrevista) : ''}
                              onChangeText={v => atualizarParcela(index, 'dataPrevista', formatDateInput(v))}
                              placeholder="Data da parcela (opcional)"
                              placeholderTextColor="#3A3A5A"
                              keyboardType="numeric"
                              maxLength={10}
                            />
                          </View>
                        ))}
                      </>
                    )}
                  </>
                )}

                {/* Valor atual (só economia) */}
                {tipo === 'economia' && (
                  <>
                    <Text style={modal.label}>Quanto já tem guardado?</Text>
                    <View style={modal.saldoRow}>
                      <Text style={modal.saldoPrefixo}>R$</Text>
                      <TextInput
                        style={modal.saldoInput}
                        value={valorAtualRaw}
                        onChangeText={v => setValorAtualRaw(formatValorInput(v))}
                        placeholder="0,00"
                        placeholderTextColor="#3A3A5A"
                        keyboardType="numeric"
                      />
                    </View>
                  </>
                )}

                {/* Prazo */}
                {tipo !== 'divida_atrasada' && (
                  <>
                    <Text style={modal.label}>Prazo (DD/MM/AAAA)</Text>
                    <TextInput
                      style={modal.input}
                      value={prazo}
                      onChangeText={(v) => setPrazo(formatDateInput(v))}
                      placeholder="Ex: 31/12/2026"
                      placeholderTextColor="#3A3A5A"
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </>
                )}

                <View style={modal.btns}>
                  <TouchableOpacity style={modal.btnCancelar} onPress={() => setEtapa(1)}>
                    <Ionicons name="arrow-back" size={14} color="#5A5A80" />
                    <Text style={modal.btnCancelarTexto}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modal.btnSalvar, salvando && { opacity: 0.6 }]}
                    onPress={handleSalvar} disabled={salvando}
                  >
                    {salvando
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={modal.btnSalvarTexto}>Criar meta</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── modal adicionar valor (economia) ────────────────────────────────────────

function ModalAdicionarValor({
  meta, onClose, onSalvar,
}: {
  meta: Meta;
  onClose: () => void;
  onSalvar: (novoValor: number) => Promise<void>;
}) {
  const [raw, setRaw] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    const valor = parseCentavos(raw);
    if (valor <= 0) { Alert.alert('Atenção', 'Digite um valor válido.'); return; }
    setSalvando(true);
    try {
      await onSalvar(meta.valorAtual + valor);
      onClose();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível adicionar o valor.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade">
      <View style={modal.overlay}>
        <View style={[modal.box, { borderRadius: 20 }]}>
          <View style={modal.header}>
            <Text style={modal.titulo}>Adicionar valor</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color="#5A5A80" />
            </TouchableOpacity>
          </View>
          <Text style={modal.label}>Quanto deseja adicionar?</Text>
          <View style={modal.saldoRow}>
            <Text style={modal.saldoPrefixo}>R$</Text>
            <TextInput
              style={modal.saldoInput}
              value={raw}
              onChangeText={v => setRaw(formatValorInput(v))}
              placeholder="0,00"
              placeholderTextColor="#3A3A5A"
              keyboardType="numeric"
              autoFocus
            />
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

// ─── card de meta ─────────────────────────────────────────────────────────────

function ModalRegistrarPagamentoDivida({
  meta, onClose, onSalvar,
}: {
  meta: Meta;
  onClose: () => void;
  onSalvar: (metaAtualizada: Partial<Meta>) => Promise<void>;
}) {
  const [raw, setRaw] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');
  const [parcelaSelecionadaId, setParcelaSelecionadaId] = useState<string>(meta.parcelas?.find(parcela => !parcela.paga)?.id ?? '');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    const dataFinal = parseDateInput(dataPagamento) ?? new Date().toISOString().slice(0, 10);
    setSalvando(true);

    try {
      if (meta.modalidadeDivida === 'parcelado') {
        const parcelaSelecionada = meta.parcelas?.find(parcela => parcela.id === parcelaSelecionadaId);
        if (!parcelaSelecionada) {
          Alert.alert('Atenção', 'Selecione uma parcela para registrar o pagamento.');
          return;
        }

        const parcelasAtualizadas = (meta.parcelas ?? []).map(parcela =>
          parcela.id === parcelaSelecionada.id
            ? { ...parcela, paga: true, dataPagamento: dataFinal }
            : parcela
        );

        await onSalvar({
          parcelas: parcelasAtualizadas,
          valorAtual: somarParcelas(parcelasAtualizadas.filter(parcela => parcela.paga)),
          concluida: parcelasAtualizadas.every(parcela => parcela.paga),
          prazo: calcularPrazoDivida(parcelasAtualizadas),
        });
      } else {
        const valorPagamento = parseCentavos(raw) || Math.max(meta.valorAlvo - meta.valorAtual, 0);
        if (valorPagamento <= 0) {
          Alert.alert('Atenção', 'Digite um valor válido para registrar o pagamento.');
          return;
        }

        const novoValor = Math.min(meta.valorAtual + valorPagamento, meta.valorAlvo);
        await onSalvar({
          valorAtual: novoValor,
          dataPagamentoAvista: dataFinal,
          concluida: novoValor >= meta.valorAlvo,
          prazo: dataFinal,
        });
      }

      onClose();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível registrar o pagamento.');
    } finally {
      setSalvando(false);
    }
  }

  const parcelasPendentes = (meta.parcelas ?? []).filter(parcela => !parcela.paga);

  return (
    <Modal visible transparent animationType="fade">
      <View style={modal.overlay}>
        <View style={[modal.box, { borderRadius: 20 }]}>
          <View style={modal.header}>
            <Text style={modal.titulo}>Registrar pagamento</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color="#5A5A80" />
            </TouchableOpacity>
          </View>

          {meta.modalidadeDivida === 'parcelado' ? (
            <>
              <Text style={modal.label}>Selecione a parcela</Text>
              <View style={modal.tiposGrid}>
                {parcelasPendentes.map(parcela => (
                  <TouchableOpacity
                    key={parcela.id}
                    style={[
                      modal.tipoCard,
                      parcelaSelecionadaId === parcela.id && { borderColor: meta.cor, backgroundColor: meta.cor + '18' },
                    ]}
                    onPress={() => setParcelaSelecionadaId(parcela.id)}
                  >
                    <View style={[modal.tipoIconBox, { backgroundColor: meta.cor + '22' }]}>
                      <Ionicons name="receipt-outline" size={18} color={meta.cor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[modal.tipoLabel, parcelaSelecionadaId === parcela.id && { color: meta.cor }]}>
                        Parcela {parcela.numero}
                      </Text>
                      <Text style={modal.tipoDesc}>
                        {formatBRL(parcela.valor)}
                        {parcela.dataPrevista ? ` • ${format(new Date(parcela.dataPrevista), 'dd/MM/yyyy')}` : ' • sem data definida'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={modal.label}>Valor pago</Text>
              <View style={modal.saldoRow}>
                <Text style={modal.saldoPrefixo}>R$</Text>
                <TextInput
                  style={modal.saldoInput}
                  value={raw}
                  onChangeText={v => setRaw(formatValorInput(v))}
                  placeholder={formatBRL(Math.max(meta.valorAlvo - meta.valorAtual, 0)).replace('R$', '').trim()}
                  placeholderTextColor="#3A3A5A"
                  keyboardType="numeric"
                  autoFocus
                />
              </View>
            </>
          )}

          <Text style={modal.label}>Data do pagamento (opcional)</Text>
          <TextInput
            style={modal.input}
            value={dataPagamento}
            onChangeText={v => setDataPagamento(formatDateInput(v))}
            placeholder="Se deixar vazio, usa o dia atual"
            placeholderTextColor="#3A3A5A"
            keyboardType="numeric"
            maxLength={10}
          />

          <View style={modal.btns}>
            <TouchableOpacity style={modal.btnCancelar} onPress={onClose}>
              <Text style={modal.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.btnSalvar, salvando && { opacity: 0.6 }]}
              onPress={handleSalvar}
              disabled={salvando}
            >
              {salvando ? <ActivityIndicator size="small" color="#fff" /> : <Text style={modal.btnSalvarTexto}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CardMeta({
  meta, saldoAtual, despesaCategoria,
  onAdicionar, onExcluir, onConcluir, onRegistrarPagamento,
}: {
  meta: Meta;
  saldoAtual: number;
  despesaCategoria: number;
  onAdicionar: () => void;
  onExcluir: () => void;
  onConcluir: () => void;
  onRegistrarPagamento: () => void;
}) {
  const info = infoTipo(meta.tipo);
  const dias = diasRestantes(meta.prazo);
  const vencida = isPast(new Date(meta.prazo)) && !meta.concluida;

  // Cálculo de progresso por tipo
  let progresso = 0;
  let valorProgresso = 0;
  let valorAlvo = meta.valorAlvo;
  let label = '';

  if (meta.tipo === 'economia') {
    valorProgresso = meta.valorAtual;
    progresso = Math.min((meta.valorAtual / meta.valorAlvo) * 100, 100);
    label = `${formatBRL(meta.valorAtual)} de ${formatBRL(meta.valorAlvo)}`;
  } else if (meta.tipo === 'gasto_maximo') {
    valorProgresso = despesaCategoria;
    progresso = Math.min((despesaCategoria / meta.valorAlvo) * 100, 100);
    label = `${formatBRL(despesaCategoria)} de ${formatBRL(meta.valorAlvo)}`;
  } else if (meta.tipo === 'saldo_minimo') {
    valorProgresso = saldoAtual;
    progresso = Math.min((saldoAtual / meta.valorAlvo) * 100, 100);
    label = `Saldo atual: ${formatBRL(saldoAtual)}`;
  } else {
    const totalPago = meta.modalidadeDivida === 'parcelado'
      ? somarParcelas((meta.parcelas ?? []).filter(parcela => parcela.paga))
      : meta.valorAtual;
    valorProgresso = totalPago;
    progresso = meta.valorAlvo > 0 ? Math.min((totalPago / meta.valorAlvo) * 100, 100) : 0;
    label = `${formatBRL(totalPago)} de ${formatBRL(meta.valorAlvo)}`;
  }

  const faltando = Math.max(meta.valorAlvo - valorProgresso, 0);
  const porMes = meta.tipo === 'economia' ? valorPorMes(faltando, meta.prazo) : 0;
  const corBarra = vencida ? '#FF5C5C' :
    meta.tipo === 'gasto_maximo' && progresso >= 100 ? '#FF5C5C' : meta.cor;
  const concluida = meta.concluida ||
    (meta.tipo === 'economia' && meta.valorAtual >= meta.valorAlvo) ||
    (meta.tipo === 'saldo_minimo' && saldoAtual >= meta.valorAlvo) ||
    (meta.tipo === 'divida_atrasada' && valorProgresso >= meta.valorAlvo);

  return (
    <View style={[
      styles.metaCard,
      concluida && styles.metaCardConcluida,
      vencida && styles.metaCardVencida,
    ]}>
      {/* Topo */}
      <View style={styles.metaCardTopo}>
        <View style={[styles.metaIconBox, { backgroundColor: meta.cor + '22' }]}>
          <Ionicons name={meta.icone as any} size={18} color={meta.cor} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.metaNomeRow}>
            <Text style={styles.metaNome}>{meta.nome}</Text>
            {concluida && (
              <View style={styles.badgeConcluida}>
                <Ionicons name="checkmark" size={10} color="#00D4AA" />
                <Text style={styles.badgeConcluidaTexto}>Concluída</Text>
              </View>
            )}
            {vencida && !concluida && (
              <View style={styles.badgeVencida}>
                <Text style={styles.badgeVencidaTexto}>Vencida</Text>
              </View>
            )}
          </View>
          <Text style={[styles.metaTipo, { color: info.cor }]}>{info.label}</Text>
        </View>
        <TouchableOpacity onPress={onExcluir} style={styles.excluirBtn}>
          <Ionicons name="trash-outline" size={14} color="#3A3A5A" />
        </TouchableOpacity>
      </View>

      {/* Progresso */}
      <View style={styles.metaProgresso}>
        <View style={styles.metaProgressoInfo}>
          <Text style={styles.metaProgressoLabel}>{label}</Text>
          <Text style={[styles.metaProgressoPerc, { color: corBarra }]}>
            {Math.round(progresso)}%
          </Text>
        </View>
        <View style={styles.metaBarraFundo}>
          <View style={[styles.metaBarraPreench, {
            width: `${progresso}%`,
            backgroundColor: corBarra,
          }]} />
        </View>
      </View>

      {/* Info prazo e por mês */}
      <View style={styles.metaInfoRow}>
        <View style={styles.metaInfoItem}>
          <Ionicons name="calendar-outline" size={11} color="#5A5A80" />
          <Text style={styles.metaInfoTexto}>
            {vencida ? 'Vencida em ' : `${dias} dias restantes — `}
            {format(new Date(meta.prazo), "dd MMM yyyy", { locale: ptBR })}
          </Text>
        </View>
        {meta.tipo === 'economia' && !concluida && porMes > 0 && (
          <View style={styles.metaInfoItem}>
            <Ionicons name="arrow-up-outline" size={11} color="#5A5A80" />
            <Text style={styles.metaInfoTexto}>{formatBRL(porMes)}/mês</Text>
          </View>
        )}
        {meta.tipo === 'divida_atrasada' && meta.modalidadeDivida === 'parcelado' && (
          <View style={styles.metaInfoItem}>
            <Ionicons name="copy-outline" size={11} color="#5A5A80" />
            <Text style={styles.metaInfoTexto}>
              {contarParcelasPagas(meta.parcelas ?? [])}/{meta.parcelas?.length ?? 0} parcelas pagas
            </Text>
          </View>
        )}
      </View>

      {/* Ação */}
      {meta.tipo === 'economia' && !concluida && (
        <TouchableOpacity style={[styles.metaAcaoBtn, { borderColor: meta.cor }]} onPress={onAdicionar}>
          <Ionicons name="add-circle-outline" size={14} color={meta.cor} />
          <Text style={[styles.metaAcaoBtnTexto, { color: meta.cor }]}>Adicionar valor</Text>
        </TouchableOpacity>
      )}
      {meta.tipo === 'divida_atrasada' && !concluida && (
        <TouchableOpacity style={[styles.metaAcaoBtn, { borderColor: meta.cor }]} onPress={onRegistrarPagamento}>
          <Ionicons name="cash-outline" size={14} color={meta.cor} />
          <Text style={[styles.metaAcaoBtnTexto, { color: meta.cor }]}>Registrar pagamento</Text>
        </TouchableOpacity>
      )}
      {concluida && !meta.concluida && (
        <TouchableOpacity style={styles.metaConcluidaBtn} onPress={onConcluir}>
          <Ionicons name="checkmark-circle-outline" size={14} color="#00D4AA" />
          <Text style={styles.metaConcluidaBtnTexto}>Marcar como concluída</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── tela principal ───────────────────────────────────────────────────────────

export default function GoalsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { transacoes, saldoDisponivel } = useFinance();

  const [metas, setMetas] = useState<Meta[]>([]);
  const [modalCriar, setModalCriar] = useState(false);
  const [metaAdicionar, setMetaAdicionar] = useState<Meta | null>(null);
  const [metaPagamento, setMetaPagamento] = useState<Meta | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'metas_kipo'), where('uid', '==', user.uid));
    return onSnapshot(q, snap => {
      setMetas(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Meta, 'id'>) })));
    });
  }, [user]);

  async function criarMeta(meta: Omit<Meta, 'id' | 'uid' | 'concluida'>) {
    if (!user) return;
    await addDoc(collection(db, 'metas_kipo'), {
      ...meta,
      uid: user.uid,
      concluida: meta.valorAtual >= meta.valorAlvo,
    });
  }

  async function excluirMeta(id: string) {
    Alert.alert('Excluir meta', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteDoc(doc(db, 'metas_kipo', id)) },
    ]);
  }

  async function adicionarValor(id: string, novoValor: number) {
    await updateDoc(doc(db, 'metas_kipo', id), { valorAtual: novoValor });
  }

  async function atualizarMeta(id: string, dados: Partial<Meta>) {
    await updateDoc(doc(db, 'metas_kipo', id), dados);
  }

  async function concluirMeta(id: string) {
    await updateDoc(doc(db, 'metas_kipo', id), { concluida: true });
  }

  function despesaCategoria(categoria: string): number {
    return transacoes
      .filter(t => t.tipo === 'despesa' && t.categoria?.toLowerCase() === categoria.toLowerCase())
      .reduce((a, t) => a + t.valor, 0);
  }

  const metasAtivas = metas.filter(m => !m.concluida);
  const metasConcluidas = metas.filter(m => m.concluida);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />

      <ModalCriarMeta
        visible={modalCriar}
        onClose={() => setModalCriar(false)}
        onSalvar={criarMeta}
      />

      {metaAdicionar && (
        <ModalAdicionarValor
          meta={metaAdicionar}
          onClose={() => setMetaAdicionar(null)}
          onSalvar={v => adicionarValor(metaAdicionar.id, v)}
        />
      )}

      {metaPagamento && (
        <ModalRegistrarPagamentoDivida
          meta={metaPagamento}
          onClose={() => setMetaPagamento(null)}
          onSalvar={dados => atualizarMeta(metaPagamento.id, dados)}
        />
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitulo}>Metas</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalCriar(true)}>
            <Ionicons name="add" size={18} color="#6C63FF" />
          </TouchableOpacity>
        </View>

        {/* Resumo */}
        <View style={styles.resumoRow}>
          <View style={styles.resumoItem}>
            <Text style={styles.resumoValor}>{metasAtivas.length}</Text>
            <Text style={styles.resumoLabel}>Em andamento</Text>
          </View>
          <View style={styles.resumoDivisor} />
          <View style={styles.resumoItem}>
            <Text style={[styles.resumoValor, { color: '#00D4AA' }]}>{metasConcluidas.length}</Text>
            <Text style={styles.resumoLabel}>Concluídas</Text>
          </View>
          <View style={styles.resumoDivisor} />
          <View style={styles.resumoItem}>
            <Text style={styles.resumoValor}>{metas.length}</Text>
            <Text style={styles.resumoLabel}>Total</Text>
          </View>
        </View>

        {/* Metas ativas */}
        {metasAtivas.length === 0 && metasConcluidas.length === 0 ? (
          <TouchableOpacity style={styles.vazioCard} onPress={() => setModalCriar(true)}>
            <Ionicons name="flag-outline" size={36} color="#3A3A5A" />
            <Text style={styles.vazioTexto}>Nenhuma meta criada ainda</Text>
            <Text style={styles.vazioSub}>Toque para criar sua primeira meta</Text>
          </TouchableOpacity>
        ) : (
          <>
            {metasAtivas.length > 0 && (
              <>
                <Text style={styles.secaoTitulo}>EM ANDAMENTO</Text>
                {metasAtivas.map(meta => (
                  <CardMeta
                    key={meta.id}
                    meta={meta}
                    saldoAtual={saldoDisponivel}
                    despesaCategoria={despesaCategoria(meta.categoria ?? '')}
                    onAdicionar={() => setMetaAdicionar(meta)}
                    onExcluir={() => excluirMeta(meta.id)}
                    onConcluir={() => concluirMeta(meta.id)}
                    onRegistrarPagamento={() => setMetaPagamento(meta)}
                  />
                ))}
              </>
            )}

            {metasConcluidas.length > 0 && (
              <>
                <Text style={styles.secaoTitulo}>CONCLUÍDAS</Text>
                {metasConcluidas.map(meta => (
                  <CardMeta
                    key={meta.id}
                    meta={meta}
                    saldoAtual={saldoDisponivel}
                    despesaCategoria={despesaCategoria(meta.categoria ?? '')}
                    onAdicionar={() => setMetaAdicionar(meta)}
                    onExcluir={() => excluirMeta(meta.id)}
                    onConcluir={() => concluirMeta(meta.id)}
                    onRegistrarPagamento={() => setMetaPagamento(meta)}
                  />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalCriar(true)}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
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

  resumoRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 20,
    backgroundColor: '#141428', borderRadius: 18,
    borderWidth: 1, borderColor: '#252545', padding: 16,
    alignItems: 'center',
  },
  resumoItem: { flex: 1, alignItems: 'center' },
  resumoValor: { fontSize: 22, fontWeight: '700', color: '#F0F0FF' },
  resumoLabel: { fontSize: 10, color: '#5A5A80', marginTop: 2 },
  resumoDivisor: { width: 1, height: 32, backgroundColor: '#252545' },

  secaoTitulo: {
    fontSize: 10, fontWeight: '700', color: '#3A3A5A',
    letterSpacing: 1.2, marginHorizontal: 20, marginBottom: 10, marginTop: 4,
  },

  metaCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#141428', borderRadius: 18,
    borderWidth: 1, borderColor: '#252545', padding: 16, gap: 12,
  },
  metaCardConcluida: { borderColor: '#00D4AA22', opacity: 0.85 },
  metaCardVencida: { borderColor: '#FF5C5C33' },

  metaCardTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaIconBox: {
    width: 42, height: 42, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  metaNomeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaNome: { fontSize: 14, fontWeight: '600', color: '#F0F0FF' },
  metaTipo: { fontSize: 10, marginTop: 2 },
  excluirBtn: { padding: 4 },

  badgeConcluida: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#00D4AA22', borderWidth: 1, borderColor: '#00D4AA44',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeConcluidaTexto: { fontSize: 9, color: '#00D4AA' },
  badgeVencida: {
    backgroundColor: '#FF5C5C22', borderWidth: 1, borderColor: '#FF5C5C44',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeVencidaTexto: { fontSize: 9, color: '#FF5C5C' },

  metaProgresso: { gap: 6 },
  metaProgressoInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  metaProgressoLabel: { fontSize: 11, color: '#9090BB' },
  metaProgressoPerc: { fontSize: 11, fontWeight: '700' },
  metaBarraFundo: { height: 6, backgroundColor: '#1A1A2E', borderRadius: 3, overflow: 'hidden' },
  metaBarraPreench: { height: '100%', borderRadius: 3 },

  metaInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaInfoTexto: { fontSize: 10, color: '#5A5A80' },

  metaAcaoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: 12, paddingVertical: 10,
  },
  metaAcaoBtnTexto: { fontSize: 12, fontWeight: '600' },

  metaConcluidaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#00D4AA44', borderRadius: 12, paddingVertical: 10,
    backgroundColor: '#00D4AA11',
  },
  metaConcluidaBtnTexto: { fontSize: 12, fontWeight: '600', color: '#00D4AA' },

  vazioCard: {
    marginHorizontal: 16, padding: 40, alignItems: 'center', gap: 8,
    backgroundColor: '#141428', borderRadius: 18,
    borderWidth: 1, borderColor: '#252545',
  },
  vazioTexto: { fontSize: 14, color: '#3A3A5A', fontWeight: '600' },
  vazioSub: { fontSize: 11, color: '#2A2A45' },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#6C63FF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  box: {
    backgroundColor: '#1A1A2E', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: '#252545', padding: 24, maxHeight: '90%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titulo: { fontSize: 15, fontWeight: '700', color: '#F0F0FF' },
  label: { fontSize: 11, color: '#5A5A80', marginBottom: 8, marginTop: 14, fontWeight: '600' },
  input: {
    backgroundColor: '#0F0F1A', borderWidth: 1, borderColor: '#252545',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 13, color: '#F0F0FF',
  },
  tiposGrid: { gap: 8 },
  tipoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0F0F1A', borderWidth: 1, borderColor: '#252545',
    borderRadius: 14, padding: 14,
  },
  tipoIconBox: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  tipoLabel: { fontSize: 13, fontWeight: '600', color: '#F0F0FF' },
  tipoDesc: { fontSize: 10, color: '#5A5A80', marginTop: 1 },
  opcoesLinha: { flexDirection: 'row', gap: 8 },
  opcaoBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#252545',
    backgroundColor: '#0F0F1A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  opcaoTexto: { fontSize: 12, fontWeight: '600', color: '#9090BB' },
  parcelaCard: {
    backgroundColor: '#0F0F1A',
    borderWidth: 1,
    borderColor: '#252545',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  parcelaTitulo: { fontSize: 12, fontWeight: '700', color: '#F0F0FF', marginBottom: 10 },
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
  corBtnAtiva: { borderWidth: 2, borderColor: '#fff' },
  saldoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saldoPrefixo: { fontSize: 16, fontWeight: '700', color: '#5A5A80' },
  saldoInput: {
    flex: 1, backgroundColor: '#0F0F1A', borderWidth: 1, borderColor: '#252545',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 20, fontWeight: '700', color: '#F0F0FF',
  },
  btns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btnCancelar: {
    flex: 1, paddingVertical: 13, borderRadius: 12, flexDirection: 'row',
    backgroundColor: '#0F0F1A', borderWidth: 1, borderColor: '#252545',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnCancelarTexto: { fontSize: 13, color: '#5A5A80', fontWeight: '600' },
  btnSalvar: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: '#6C63FF', alignItems: 'center',
  },
  btnSalvarTexto: { fontSize: 13, color: '#fff', fontWeight: '700' },
  btnProximo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#6C63FF', borderRadius: 14,
    paddingVertical: 14, marginTop: 20,
  },
  btnProximoTexto: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
