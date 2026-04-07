// src/screens/Home/components/GraficoRosca.tsx
// Responsabilidade: exibir gráfico de categorias e progresso vs limite.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { CategoriaResumo } from '../hooks/useHomeData';

interface Props {
  categorias: CategoriaResumo[];
  totalDespesas: number;
  mesLabel: string;
}

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatBRLCurto(centavos: number): string {
  if (centavos >= 100000) return `R$${(centavos / 100000).toFixed(1)}k`;
  return `R$${(centavos / 100).toFixed(0)}`;
}

export default function GraficoRosca({ categorias, totalDespesas, mesLabel }: Props) {
  const raio = 28;
  const circunferencia = 2 * Math.PI * raio;
  const cx = 38;
  const cy = 38;

  // Calcular segmentos da rosca
  const totalValor = categorias.reduce((a, c) => a + c.valor, 0) || 1;
  let offset = 0;
  const segmentos = categorias.map(cat => {
    const dash = (cat.valor / totalValor) * circunferencia;
    const seg = { dash, offset, cor: cat.cor };
    offset += dash;
    return seg;
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Total gasto</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{mesLabel}</Text>
        </View>
      </View>

      {/* Rosca + legenda */}
      <View style={styles.roncaRow}>
        <Svg width={76} height={76} viewBox="0 0 76 76">
          <Circle cx={cx} cy={cy} r={raio} fill="none" stroke="#1A1A2E" strokeWidth={11} />
          {segmentos.map((seg, i) => (
            <Circle
              key={i}
              cx={cx} cy={cy} r={raio}
              fill="none"
              stroke={seg.cor}
              strokeWidth={11}
              strokeDasharray={`${seg.dash} ${circunferencia - seg.dash}`}
              strokeDashoffset={-seg.offset}
              strokeLinecap="round"
            />
          ))}
          <SvgText x={cx} y={cy - 4} textAnchor="middle" fill="#F0F0FF" fontSize={7} fontWeight="700">
            {formatBRLCurto(totalDespesas)}
          </SvgText>
          <SvgText x={cx} y={cy + 7} textAnchor="middle" fill="#5A5A80" fontSize={6}>
            total
          </SvgText>
        </Svg>

        <View style={styles.legenda}>
          {categorias.map((cat, i) => {
            const percentual = Math.round((cat.valor / totalValor) * 100);
            return (
              <View key={i} style={styles.legendaItem}>
                <View style={styles.legendaEsq}>
                  <View style={[styles.legendaDot, { backgroundColor: cat.cor }]} />
                  <Text style={styles.legendaNome}>{cat.nome}</Text>
                </View>
                <Text style={styles.legendaPerc}>{percentual}%</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Barras de progresso */}
      {categorias.length > 0 && (
        <View style={styles.progresso}>
          <View style={styles.progressoHeader}>
            <Text style={styles.progressoTitulo}>Progresso vs limite</Text>
          </View>
          {categorias.filter(c => c.limite > 0).map((cat, i) => (
            <View key={i} style={styles.progressoItem}>
              <View style={styles.progressoLabelRow}>
                <Text style={styles.progressoNome}>{cat.nome}</Text>
                <Text style={[styles.progressoValor, cat.ultrapassado && styles.ultrapassado]}>
                  {formatBRL(cat.valor)} / {formatBRL(cat.limite)}
                </Text>
              </View>
              <View style={styles.barraFundo}>
                <View style={[
                  styles.barraPreenchida,
                  { width: `${cat.percentual}%`, backgroundColor: cat.ultrapassado ? '#FF5C5C' : cat.cor },
                ]} />
              </View>
              {cat.ultrapassado && (
                <Text style={styles.alertaTexto}>Limite ultrapassado!</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#141428',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#252545',
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titulo: { fontSize: 13, fontWeight: '600', color: '#F0F0FF' },
  badge: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#252545',
  },
  badgeText: { fontSize: 10, color: '#5A5A80' },
  roncaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  legenda: { flex: 1, gap: 6 },
  legendaItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendaEsq: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendaDot: { width: 7, height: 7, borderRadius: 2 },
  legendaNome: { fontSize: 10, color: '#9090BB' },
  legendaPerc: { fontSize: 10, fontWeight: '600', color: '#F0F0FF' },
  progresso: { borderTopWidth: 1, borderTopColor: '#1E1E38', paddingTop: 14, gap: 10 },
  progressoHeader: { marginBottom: 2 },
  progressoTitulo: { fontSize: 10, color: '#5A5A80', letterSpacing: 0.5, textTransform: 'uppercase' },
  progressoItem: { gap: 5 },
  progressoLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressoNome: { fontSize: 11, color: '#9090BB' },
  progressoValor: { fontSize: 11, color: '#F0F0FF' },
  ultrapassado: { color: '#FF5C5C' },
  barraFundo: { height: 5, backgroundColor: '#1A1A2E', borderRadius: 3, overflow: 'hidden' },
  barraPreenchida: { height: '100%', borderRadius: 3 },
  alertaTexto: { fontSize: 9, color: '#FF5C5C' },
});
