// src/screens/Projection/ProjectionScreen.tsx
//
// Tela de Relatório: resumo mensal, gráfico de barras por mês,
// gráfico de categorias e comparação receita x despesa.
// Filtro por período personalizado (mês/ano).

import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Circle, Line, Text as SvgText } from 'react-native-svg';
import {
  startOfMonth, endOfMonth, subMonths, addMonths,
  isWithinInterval, format,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinance } from '../../context/FinanceContext';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  });
}

function formatBRLCurto(centavos: number): string {
  if (Math.abs(centavos) >= 100000)
    return `R$${(centavos / 100000).toFixed(1)}k`;
  return `R$${(centavos / 100).toFixed(0)}`;
}

function timestampToDate(data: any): Date {
  if (!data) return new Date();
  if (data?.toDate) return data.toDate();
  if (data instanceof Date) return data;
  return new Date(data);
}

// ─── gráfico de barras por mês ────────────────────────────────────────────────

function GraficoBarras({ dados }: {
  dados: { mes: string; receitas: number; despesas: number }[];
}) {
  const maxVal = Math.max(...dados.flatMap(d => [d.receitas, d.despesas]), 1);
  const W = 320;
  const H = 120;
  const paddingLeft = 36;
  const paddingBottom = 20;
  const chartH = H - paddingBottom;
  const barW = 10;
  const gap = (W - paddingLeft) / dados.length;

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Linhas guia */}
      {[0, 0.5, 1].map((f, i) => {
        const y = chartH - f * chartH;
        return (
          <Line key={i} x1={paddingLeft} y1={y} x2={W} y2={y}
            stroke="#1E1E38" strokeWidth={1} />
        );
      })}

      {dados.map((d, i) => {
        const cx = paddingLeft + i * gap + gap / 2;
        const hR = d.receitas > 0 ? Math.max((d.receitas / maxVal) * chartH, 4) : 0;
        const hD = d.despesas > 0 ? Math.max((d.despesas / maxVal) * chartH, 4) : 0;

        return (
          <React.Fragment key={i}>
            {/* Barra receita */}
            <Rect
              x={cx - barW - 2} y={chartH - hR}
              width={barW} height={hR}
              rx={3} fill="#00D4AA"
            />
            {/* Barra despesa */}
            <Rect
              x={cx + 2} y={chartH - hD}
              width={barW} height={hD}
              rx={3} fill="#FF5C5C"
            />
            {/* Label mês */}
            <SvgText
              x={cx} y={H - 4}
              textAnchor="middle" fill="#5A5A80" fontSize={8}
            >
              {d.mes}
            </SvgText>
          </React.Fragment>
        );
      })}

      {/* Eixo Y labels */}
      {[0, 0.5, 1].map((f, i) => (
        <SvgText key={i} x={paddingLeft - 4} y={chartH - f * chartH + 3}
          textAnchor="end" fill="#3A3A5A" fontSize={7}>
          {formatBRLCurto(f * maxVal)}
        </SvgText>
      ))}
    </Svg>
  );
}

// ─── gráfico de rosca categorias ──────────────────────────────────────────────

const CORES_CAT = ['#6C63FF', '#FF5C5C', '#FFB830', '#00D4AA', '#00BCD4', '#FF8C42', '#4CAF50', '#E91E63'];

function GraficoCategorias({ categorias }: {
  categorias: { nome: string; valor: number }[];
}) {
  const raio = 36;
  const circ = 2 * Math.PI * raio;
  const total = categorias.reduce((a, c) => a + c.valor, 0) || 1;
  let offset = 0;

  const segmentos = categorias.map((cat, i) => {
    const dash = (cat.valor / total) * circ;
    const seg = { dash, offset, cor: CORES_CAT[i % CORES_CAT.length] };
    offset += dash;
    return seg;
  });

  return (
    <View style={styles.catRow}>
      <Svg width={90} height={90} viewBox="0 0 90 90">
        <Circle cx={45} cy={45} r={raio} fill="none" stroke="#1A1A2E" strokeWidth={14} />
        {segmentos.map((seg, i) => (
          <Circle key={i} cx={45} cy={45} r={raio}
            fill="none" stroke={seg.cor} strokeWidth={14}
            strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
            strokeDashoffset={-seg.offset} strokeLinecap="round"
          />
        ))}
        <SvgText x={45} y={42} textAnchor="middle" fill="#F0F0FF" fontSize={8} fontWeight="700">
          {categorias.length}
        </SvgText>
        <SvgText x={45} y={52} textAnchor="middle" fill="#5A5A80" fontSize={7}>
          categ.
        </SvgText>
      </Svg>

      <View style={styles.catLegenda}>
        {categorias.slice(0, 6).map((cat, i) => {
          const perc = Math.round((cat.valor / total) * 100);
          return (
            <View key={i} style={styles.catLegendaItem}>
              <View style={[styles.catDot, { backgroundColor: CORES_CAT[i % CORES_CAT.length] }]} />
              <Text style={styles.catNome} numberOfLines={1}>{cat.nome}</Text>
              <Text style={styles.catPerc}>{perc}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── tela principal ───────────────────────────────────────────────────────────

export default function ProjectionScreen() {
  const { transacoes } = useFinance();
  const [mesAtual, setMesAtual] = useState(new Date());

  const mesLabel = format(mesAtual, 'MMMM yyyy', { locale: ptBR });
  const irAntes = () => setMesAtual(m => subMonths(m, 1));
  const irDepois = () => setMesAtual(m => addMonths(m, 1));

  // Transações do mês selecionado
  const transacoesMes = useMemo(() => {
    const ini = startOfMonth(mesAtual);
    const fim = endOfMonth(mesAtual);
    return transacoes.filter(t =>
      isWithinInterval(timestampToDate(t.data), { start: ini, end: fim })
    );
  }, [transacoes, mesAtual]);

  const receitasMes = useMemo(() =>
    transacoesMes.filter(t => t.tipo === 'receita').reduce((a, t) => a + t.valor, 0),
    [transacoesMes]);

  const despesasMes = useMemo(() =>
    transacoesMes.filter(t => t.tipo === 'despesa').reduce((a, t) => a + t.valor, 0),
    [transacoesMes]);

  const saldoMes = receitasMes - despesasMes;
  const taxaEconomia = receitasMes > 0
    ? Math.max(0, Math.round(((receitasMes - despesasMes) / receitasMes) * 100))
    : 0;

  // Dados dos últimos 6 meses para o gráfico
  const dadosGrafico = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(mesAtual, 5 - i);
      const ini = startOfMonth(m);
      const fim = endOfMonth(m);
      const tMes = transacoes.filter(t =>
        isWithinInterval(timestampToDate(t.data), { start: ini, end: fim })
      );
      return {
        mes: format(m, 'MMM', { locale: ptBR }),
        receitas: tMes.filter(t => t.tipo === 'receita').reduce((a, t) => a + t.valor, 0),
        despesas: tMes.filter(t => t.tipo === 'despesa').reduce((a, t) => a + t.valor, 0),
      };
    });
  }, [transacoes, mesAtual]);

  // Categorias do mês
  const categorias = useMemo(() => {
    const mapa: Record<string, number> = {};
    transacoesMes.filter(t => t.tipo === 'despesa').forEach(t => {
      mapa[t.categoria] = (mapa[t.categoria] ?? 0) + t.valor;
    });
    return Object.entries(mapa)
      .map(([nome, valor]) => ({
        nome: nome.charAt(0).toUpperCase() + nome.slice(1).replace('_', ' '),
        valor,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [transacoesMes]);

  // Maior gasto do mês
  const maiorGasto = useMemo(() => {
    if (transacoesMes.filter(t => t.tipo === 'despesa').length === 0) return null;
    return transacoesMes
      .filter(t => t.tipo === 'despesa')
      .reduce((max, t) => t.valor > max.valor ? t : max);
  }, [transacoesMes]);

  // Comparação com mês anterior
  const despesasMesAnterior = useMemo(() => {
    const m = subMonths(mesAtual, 1);
    const ini = startOfMonth(m);
    const fim = endOfMonth(m);
    return transacoes
      .filter(t => t.tipo === 'despesa' &&
        isWithinInterval(timestampToDate(t.data), { start: ini, end: fim }))
      .reduce((a, t) => a + t.valor, 0);
  }, [transacoes, mesAtual]);

  const variacaoDespesas = despesasMesAnterior > 0
    ? Math.round(((despesasMes - despesasMesAnterior) / despesasMesAnterior) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitulo}>Relatório</Text>
        </View>

        {/* Seletor de mês */}
        <View style={styles.mesRow}>
          <TouchableOpacity onPress={irAntes} style={styles.mesBtn}>
            <Ionicons name="chevron-back" size={16} color="#9090BB" />
          </TouchableOpacity>
          <View style={styles.mesLabel}>
            <View style={styles.mesDot} />
            <Text style={styles.mesTexto}>{mesLabel}</Text>
          </View>
          <TouchableOpacity onPress={irDepois} style={styles.mesBtn}>
            <Ionicons name="chevron-forward" size={16} color="#9090BB" />
          </TouchableOpacity>
        </View>

        {/* Cards resumo */}
        <View style={styles.resumoGrid}>
          <View style={[styles.resumoCard, styles.resumoCardDestaque]}>
            <Text style={styles.resumoCardLabel}>Saldo do mês</Text>
            <Text style={[styles.resumoCardValor, { color: saldoMes >= 0 ? '#00D4AA' : '#FF5C5C', fontSize: 22 }]}>
              {formatBRL(saldoMes)}
            </Text>
            <Text style={styles.resumoCardSub}>
              Taxa de economia: {taxaEconomia}%
            </Text>
          </View>

          <View style={styles.resumoLinha}>
            <View style={styles.resumoCardPequeno}>
              <View style={styles.resumoCardPequenoTopo}>
                <View style={[styles.resumoDot, { backgroundColor: '#00D4AA' }]} />
                <Text style={styles.resumoCardLabel}>Entradas</Text>
              </View>
              <Text style={[styles.resumoCardValor, { color: '#00D4AA' }]}>{formatBRL(receitasMes)}</Text>
            </View>
            <View style={styles.resumoCardPequeno}>
              <View style={styles.resumoCardPequenoTopo}>
                <View style={[styles.resumoDot, { backgroundColor: '#FF5C5C' }]} />
                <Text style={styles.resumoCardLabel}>Saídas</Text>
              </View>
              <Text style={[styles.resumoCardValor, { color: '#FF5C5C' }]}>{formatBRL(despesasMes)}</Text>
            </View>
          </View>
        </View>

        {/* Insights */}
        <View style={styles.insightsRow}>
          {maiorGasto && (
            <View style={styles.insightCard}>
              <Ionicons name="trending-down-outline" size={14} color="#FFB830" />
              <View>
                <Text style={styles.insightLabel}>Maior gasto</Text>
                <Text style={styles.insightValor} numberOfLines={1}>{maiorGasto.descricao}</Text>
                <Text style={styles.insightSub}>{formatBRL(maiorGasto.valor)}</Text>
              </View>
            </View>
          )}
          <View style={styles.insightCard}>
            <Ionicons
              name={variacaoDespesas <= 0 ? 'trending-down-outline' : 'trending-up-outline'}
              size={14}
              color={variacaoDespesas <= 0 ? '#00D4AA' : '#FF5C5C'}
            />
            <View>
              <Text style={styles.insightLabel}>vs mês anterior</Text>
              <Text style={[styles.insightValor, { color: variacaoDespesas <= 0 ? '#00D4AA' : '#FF5C5C' }]}>
                {variacaoDespesas > 0 ? '+' : ''}{variacaoDespesas}%
              </Text>
              <Text style={styles.insightSub}>em despesas</Text>
            </View>
          </View>
        </View>

        {/* Gráfico de barras */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitulo}>Receitas x Despesas</Text>
            <Text style={styles.cardSub}>Últimos 6 meses</Text>
          </View>

          <View style={styles.graficoBarsLegenda}>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaDot, { backgroundColor: '#00D4AA' }]} />
              <Text style={styles.legendaTexto}>Receitas</Text>
            </View>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaDot, { backgroundColor: '#FF5C5C' }]} />
              <Text style={styles.legendaTexto}>Despesas</Text>
            </View>
          </View>

          <GraficoBarras dados={dadosGrafico} />
        </View>

        {/* Gráfico de categorias */}
        {categorias.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitulo}>Gastos por categoria</Text>
              <Text style={styles.cardSub}>{mesLabel}</Text>
            </View>
            <GraficoCategorias categorias={categorias} />

            {/* Lista detalhada */}
            <View style={styles.catDetalhes}>
              {categorias.map((cat, i) => {
                const perc = Math.round((cat.valor / (despesasMes || 1)) * 100);
                return (
                  <View key={i} style={styles.catDetalheItem}>
                    <View style={styles.catDetalheEsq}>
                      <View style={[styles.catDot, { backgroundColor: CORES_CAT[i % CORES_CAT.length] }]} />
                      <Text style={styles.catDetalheNome}>{cat.nome}</Text>
                    </View>
                    <View style={styles.catDetalheDir}>
                      <Text style={styles.catDetalheValor}>{formatBRL(cat.valor)}</Text>
                      <View style={styles.catBarraFundo}>
                        <View style={[styles.catBarraPreench, {
                          width: `${perc}%`,
                          backgroundColor: CORES_CAT[i % CORES_CAT.length],
                        }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Estado vazio */}
        {transacoesMes.length === 0 && (
          <View style={styles.vazioCard}>
            <Ionicons name="bar-chart-outline" size={36} color="#3A3A5A" />
            <Text style={styles.vazioTexto}>Sem dados neste período</Text>
            <Text style={styles.vazioSub}>Lance transações para ver o relatório</Text>
          </View>
        )}

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
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8,
  },
  headerTitulo: { fontSize: 20, fontWeight: '700', color: '#F0F0FF' },

  mesRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#141428', borderRadius: 16,
    borderWidth: 1, borderColor: '#252545', padding: 12,
  },
  mesBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#FFFFFF11', justifyContent: 'center', alignItems: 'center',
  },
  mesLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mesDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6C63FF' },
  mesTexto: { fontSize: 14, fontWeight: '600', color: '#F0F0FF' },

  resumoGrid: { paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  resumoCard: {
    backgroundColor: '#1E0F45', borderRadius: 18,
    borderWidth: 1, borderColor: '#6C63FF44',
    padding: 20,
  },
  resumoCardDestaque: {},
  resumoLinha: { flexDirection: 'row', gap: 10 },
  resumoCardPequeno: {
    flex: 1, backgroundColor: '#141428', borderRadius: 16,
    borderWidth: 1, borderColor: '#252545', padding: 14,
  },
  resumoCardPequenoTopo: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  resumoDot: { width: 5, height: 5, borderRadius: 3 },
  resumoCardLabel: { fontSize: 10, color: '#9090BB88', letterSpacing: 0.4, marginBottom: 4 },
  resumoCardValor: { fontSize: 16, fontWeight: '700', color: '#F0F0FF' },
  resumoCardSub: { fontSize: 10, color: '#5A5A80', marginTop: 4 },

  insightsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 16 },
  insightCard: {
    flex: 1, backgroundColor: '#141428', borderRadius: 14,
    borderWidth: 1, borderColor: '#252545',
    padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start',
  },
  insightLabel: { fontSize: 9, color: '#5A5A80', marginBottom: 2 },
  insightValor: { fontSize: 12, fontWeight: '700', color: '#F0F0FF' },
  insightSub: { fontSize: 9, color: '#3A3A5A', marginTop: 1 },

  card: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#141428', borderRadius: 18,
    borderWidth: 1, borderColor: '#252545', padding: 18,
  },
  cardHeader: { marginBottom: 14 },
  cardTitulo: { fontSize: 13, fontWeight: '600', color: '#F0F0FF' },
  cardSub: { fontSize: 10, color: '#5A5A80', marginTop: 2 },

  graficoBarsLegenda: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendaDot: { width: 7, height: 7, borderRadius: 2 },
  legendaTexto: { fontSize: 10, color: '#9090BB' },

  catRow: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 16 },
  catLegenda: { flex: 1, gap: 6 },
  catLegendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catDot: { width: 7, height: 7, borderRadius: 2 },
  catNome: { flex: 1, fontSize: 10, color: '#9090BB' },
  catPerc: { fontSize: 10, fontWeight: '600', color: '#F0F0FF' },

  catDetalhes: { borderTopWidth: 1, borderTopColor: '#1E1E38', paddingTop: 14, gap: 10 },
  catDetalheItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catDetalheEsq: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 110 },
  catDetalheNome: { fontSize: 11, color: '#9090BB', flex: 1 },
  catDetalheDir: { flex: 1, gap: 4 },
  catDetalheValor: { fontSize: 11, fontWeight: '600', color: '#F0F0FF', textAlign: 'right' },
  catBarraFundo: { height: 4, backgroundColor: '#1A1A2E', borderRadius: 2, overflow: 'hidden' },
  catBarraPreench: { height: '100%', borderRadius: 2 },

  vazioCard: {
    marginHorizontal: 16, padding: 40, alignItems: 'center', gap: 8,
    backgroundColor: '#141428', borderRadius: 18,
    borderWidth: 1, borderColor: '#252545',
  },
  vazioTexto: { fontSize: 14, color: '#3A3A5A', fontWeight: '600' },
  vazioSub: { fontSize: 11, color: '#2A2A45' },
});
