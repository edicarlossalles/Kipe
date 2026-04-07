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
  const raio = 34;
  const circunferencia = 2 * Math.PI * raio;
  const cx = 46;
  const cy = 46;

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
        <Svg width={92} height={92} viewBox="0 0 92 92">
          <Circle cx={cx} cy={cy} r={raio} fill="none" stroke="#1A1A2E" strokeWidth={13} />
          {segmentos.map((seg, i) => (
            <Circle
              key={i}
              cx={cx} cy={cy} r={raio}
              fill="none"
              stroke={seg.cor}
              strokeWidth={13}
              strokeDasharray={`${seg.dash} ${circunferencia - seg.dash}`}
              strokeDashoffset={-seg.offset}
              strokeLinecap="round"
            />
          ))}
          <SvgText x={cx} y={cy - 5} textAnchor="middle" fill="#F0F0FF" fontSize={9} fontWeight="700">
            {formatBRLCurto(totalDespesas)}
          </SvgText>
          <SvgText x={cx} y={cy + 10} textAnchor="middle" fill="#5A5A80" fontSize={7}>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titulo: { fontSize: 17, fontWeight: '700', color: '#F0F0FF' },
  badge: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#252545',
  },
  badgeText: { fontSize: 11, color: '#7A7AA2' },
  roncaRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 18 },
  legenda: { flex: 1, gap: 8 },
  legendaItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendaEsq: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendaDot: { width: 9, height: 9, borderRadius: 3 },
  legendaNome: { fontSize: 12, color: '#C5C5E2', fontWeight: '600' },
  legendaPerc: { fontSize: 12, fontWeight: '700', color: '#F0F0FF' },
  progresso: { borderTopWidth: 1, borderTopColor: '#1E1E38', paddingTop: 16, gap: 12 },
  progressoHeader: { marginBottom: 2 },
  progressoTitulo: { fontSize: 11, color: '#7A7AA2', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: '600' },
  progressoItem: { gap: 6 },
  progressoLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressoNome: { fontSize: 13, color: '#C5C5E2', fontWeight: '600' },
  progressoValor: { fontSize: 12, color: '#F0F0FF' },
  ultrapassado: { color: '#FF5C5C' },
  barraFundo: { height: 8, backgroundColor: '#1A1A2E', borderRadius: 4, overflow: 'hidden' },
  barraPreenchida: { height: '100%', borderRadius: 4 },
  alertaTexto: { fontSize: 10, color: '#FF5C5C', fontWeight: '600' },
});
