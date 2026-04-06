// src/constants/theme.ts

export const Colors = {
  // Paleta principal — Deep Dark (igual ao EdyRun)
  primary: '#6C63FF',       // roxo principal
  primaryLight: '#8B85FF',
  primaryDark: '#4A42D4',

  accent: '#00D4AA',        // verde-água para receitas
  accentLight: '#33DDBB',
  danger: '#FF5C5C',        // vermelho para gastos
  dangerLight: '#FF8080',
  warning: '#FFB830',       // amarelo para alertas
  success: '#4CAF50',

  // Fundos
  background: '#0F0F1A',
  backgroundSecondary: '#1A1A2E',
  backgroundTertiary: '#252540',
  card: '#1E1E35',
  cardBorder: '#2E2E50',

  // Textos
  textPrimary: '#F0F0FF',
  textSecondary: '#9090BB',
  textMuted: '#5A5A80',

  // Categorias (igual ao Kipo de referência)
  categoryEssential: '#FF8C42',   // laranja — essenciais
  categoryDebt: '#4CAF50',        // verde — dívidas/parcelas
  categoryIncome: '#6C63FF',      // roxo — rendas
  categoryLeisure: '#FF5C9A',     // rosa — lazer
  categoryHealth: '#00BCD4',      // ciano — saúde
  categoryFood: '#FFB830',        // amarelo — alimentação

  // EdyRun integration
  edyrunColor: '#00D4AA',         // cor que identifica entradas do EdyRun

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
};
