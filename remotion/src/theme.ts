// Theme configuration for Remotion - matching Cassette's design system
// Imported values from CassetteUI/src/lib/theme.ts

export const theme = {
  colors: {
    // Core Brand
    brandRed: '#ED2748',
    brandRedL: '#F36A84',
    brandRedD: '#A31B34',

    brandBlack: '#1F2327',
    brandBlackL: '#2B3035',
    brandBlackD: '#0D0F11',

    brandCream: '#F8F0DE',
    brandCreamL: '#FFF8EC',
    brandCreamD: '#E0D9C8',

    // Functional
    white: '#FFFFFF',
    gray100: '#F2F4F5',
    gray200: '#E1E3E5',
    gray300: '#C4C7CA',
    gray400: '#9A9DA1',
    gray500: '#75787C',
    gray600: '#56595C',
    gray700: '#3B3E41',
    gray800: '#2A2D30',
    gray900: '#1F2327',

    // Semantic
    success: '#1ED760',
    info: '#0093FF',

    // UI Elements
    textPrimary: '#1F2327',
    textOnDark: '#F8F0DE',
    textSecondary: '#56595C',
    textHint: '#9A9DA1',

    bgCanvas: '#0D0F11',
    bgElevated: '#1F2327',
    bgSubtle: '#2B3035',
    bgCream: '#F8F0DE',
  },

  fonts: {
    teko: 'Teko, sans-serif',
    robotoFlex: 'Roboto Flex, sans-serif',
    atkinson: 'Atkinson Hyperlegible, sans-serif',
    roboto: 'Roboto, sans-serif',
  },

  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 36,
    '5xl': 48,
    '6xl': 64,
    '7xl': 80,
  },

  fontWeights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  borderRadius: {
    sm: 2,
    default: 5,
    md: 8,
    lg: 10,
    xl: 20,
    full: 9999,
  },

  shadows: {
    main: '0 4px 4px rgba(0, 0, 0, 0.3), 0 8px 12px rgba(0, 0, 0, 0.15)',
    album: '0 4px 4px rgba(0, 0, 0, 0.25)',
    button: '0 2px 4px rgba(0, 0, 0, 0.2)',
    soft: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
} as const;

export type Theme = typeof theme;
