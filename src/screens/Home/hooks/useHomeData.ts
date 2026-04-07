// src/screens/Home/hooks/useHomeData.ts
//
// Responsabilidade única: buscar e processar dados para a Home.
// Nenhuma lógica de UI aqui.

import { useState, useMemo, useCallback } from 'react';
import { useFinance } from '../../../context/FinanceContext';
import { Transacao } from '../../../context/FinanceContext';
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  subMonths, addMonths,
  format, isWithinInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type FiltroPeriodo = 'hoje' | 'semana' | 'mes';

export interface CategoriaResumo {
  nome: string;
  valor: number;
  limite: number;
  cor: string;
  percentual: number;
  ultrapassado: boolean;
}

export interface MiniBarDado {
  mes: string;
  valor: number;
  ativo: boolean;
}

const LIMITES_CATEGORIAS: Record<string, { limite: number; cor: string }> = {
  essenciais:   { limite: 90000,  cor: '#FF8C42' },
  alimentacao:  { limite: 60000,  cor: '#FFB830' },
  saude:        { limite: 40000,  cor: '#00BCD4' },
  lazer:        { limite: 10000,  cor: '#6C63FF' },
  dividas:      { limite: 70000,  cor: '#4CAF50' },
  rendas:       { limite: 0,      cor: '#00D4AA' },
  rendas_edyrun:{ limite: 0,      cor: '#00D4AA' },
  despesas_edyrun:{ limite: 50000, cor: '#FF8C42' },
};

function timestampToDate(data: any): Date {
  if (!data) return new Date();
  if (data?.toDate) return data.toDate();
  if (data instanceof Date) return data;
  return new Date(data);
}

export function useHomeData() {
  const { transacoes, saldoDisponivel, totalReceitas, totalDespesas, loading } = useFinance();
  const [filtro, setFiltro] = useState<FiltroPeriodo>('hoje');
  const [mesAtual, setMesAtual] = useState(new Date());

  const mesLabel = format(mesAtual, 'MMMM yyyy', { locale: ptBR });
  const mesLabelCurto = format(mesAtual, 'MMM', { locale: ptBR });

  const irMesAnterior = useCallback(() => setMesAtual(m => subMonths(m, 1)), []);
  const irProximoMes  = useCallback(() => setMesAtual(m => addMonths(m, 1)), []);

  // Transações do mês selecionado
  const transacoesMes = useMemo(() => {
    const inicio = startOfMonth(mesAtual);
    const fim    = endOfMonth(mesAtual);
    return transacoes.filter(t => {
      const data = timestampToDate(t.data);
      return isWithinInterval(data, { start: inicio, end: fim });
    });
  }, [transacoes, mesAtual]);

  // Receitas e despesas do mês
  const receitasMes = useMemo(() =>
    transacoesMes.filter(t => t.tipo === 'receita').reduce((a, t) => a + t.valor, 0),
    [transacoesMes]);

  const despesasMes = useMemo(() =>
    transacoesMes.filter(t => t.tipo === 'despesa').reduce((a, t) => a + t.valor, 0),
    [transacoesMes]);

  const saldoMes = receitasMes - despesasMes;

  // Transações filtradas por período (hoje/semana/mês)
  const transacoesFiltradas = useMemo(() => {
    const agora = new Date();
    const intervalos: Record<FiltroPeriodo, { start: Date; end: Date }> = {
      hoje:   { start: startOfDay(agora),           end: endOfDay(agora) },
      semana: { start: startOfWeek(agora, { weekStartsOn: 0 }), end: endOfWeek(agora, { weekStartsOn: 0 }) },
      mes:    { start: startOfMonth(mesAtual),       end: endOfMonth(mesAtual) },
    };
    return transacoesMes.filter(t => {
      const data = timestampToDate(t.data);
      return isWithinInterval(data, intervalos[filtro]);
    });
  }, [transacoesMes, filtro, mesAtual]);

  // Resumo por categoria
  const categorias = useMemo((): CategoriaResumo[] => {
    const despesas = transacoesMes.filter(t => t.tipo === 'despesa');
    const mapa: Record<string, number> = {};
    despesas.forEach(t => {
      mapa[t.categoria] = (mapa[t.categoria] ?? 0) + t.valor;
    });

    return Object.entries(mapa)
      .filter(([cat]) => cat !== 'rendas' && cat !== 'rendas_edyrun')
      .map(([cat, valor]) => {
        const config = LIMITES_CATEGORIAS[cat] ?? { limite: 50000, cor: '#9090BB' };
        const percentual = config.limite > 0 ? Math.min((valor / config.limite) * 100, 100) : 0;
        return {
          nome: cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' '),
          valor,
          limite: config.limite,
          cor: config.cor,
          percentual,
          ultrapassado: config.limite > 0 && valor > config.limite,
        };
      })
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 4);
  }, [transacoesMes]);

  // Mini barras dos últimos 7 meses
  const miniBarras = useMemo((): MiniBarDado[] => {
    const resultado: MiniBarDado[] = [];
    const mesAtualIndex = 0;
    for (let i = 6; i >= 0; i--) {
      const m = subMonths(mesAtual, i);
      const inicio = startOfMonth(m);
      const fim    = endOfMonth(m);
      const total  = transacoes
        .filter(t => t.tipo === 'despesa')
        .filter(t => isWithinInterval(timestampToDate(t.data), { start: inicio, end: fim }))
        .reduce((a, t) => a + t.valor, 0);
      resultado.push({
        mes: format(m, 'MMM', { locale: ptBR }),
        valor: total,
        ativo: i === mesAtualIndex,
      });
    }
    return resultado;
  }, [transacoes, mesAtual]);

  return {
    loading,
    filtro,
    setFiltro,
    mesLabel,
    mesLabelCurto,
    irMesAnterior,
    irProximoMes,
    saldoMes,
    receitasMes,
    despesasMes,
    transacoesFiltradas,
    categorias,
    miniBarras,
  };
}
