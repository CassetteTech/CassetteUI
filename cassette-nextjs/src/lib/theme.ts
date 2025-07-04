// Centralized theme configuration matching Flutter app styles

export const theme = {
  colors: {
    // Primary brand colors
    primary: '#FF0054',
    secondary: '#ED2748',
    accent: '#E95E75',
    
    // Text colors
    textPrimary: '#1F2327',
    textSecondary: '#757575',
    textHint: '#C4C4C4',
    textArtist: '#5C5C5C',
    
    // Background colors
    bgCream: '#F8F0DE',
    bgProfile: '#1F2327',
    bgTab: '#C4C4C4',
    bgInput: '#F8F0DE',
    
    // Neutral colors
    white: '#FFFFFF',
    black: '#000000',
    gray: '#A7A7A7',
    grayLight: '#C4C4C4',
    grayDark: '#5C5C5C',
    
    // Accent colors
    green: '#1ED760',
    blue: '#0093FF',
    
    // Animated button colors
    btnTop: '#ED2748',
    btnTopBorder: '#FF002B',
    btnBottom: '#E95E75',
    btnConvertTop: '#1F2327',
    btnConvertBottom: '#595C5E',
    btnConvertBorder: '#1F2327',
    
    // Utility colors
    popupBg: 'rgba(31, 35, 39, 0.78)',
    popupDivider: '#8A8A8A',
    tabDivider: '#333333',
  },
  
  fonts: {
    teko: 'Teko, sans-serif',
    robotoFlex: 'Roboto Flex, sans-serif',
    atkinson: 'Atkinson Hyperlegible, sans-serif',
    roboto: 'Roboto, sans-serif',
    inter: 'Inter, sans-serif',
  },
  
  fontSizes: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '36px',
    '5xl': '38px',
  },
  
  fontWeights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  
  letterSpacing: {
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
    custom1: '0.65px',
    custom2: '0.72px',
    custom3: '0.96px',
    custom4: '1px',
    custom5: '1.08px',
    custom6: '1.26px',
    custom7: '1.44px',
    custom8: '1.5px',
  },
  
  borderRadius: {
    none: '0',
    sm: '2px',
    default: '5px',
    md: '8px',
    lg: '10px',
    xl: '20px',
    full: '9999px',
  },
  
  shadows: {
    main: '0 4px 4px rgba(0, 0, 0, 0.3), 0 8px 12px rgba(0, 0, 0, 0.15)',
    album: '0 4px 4px rgba(0, 0, 0, 0.25)',
    button: '0 2px 4px rgba(0, 0, 0, 0.2)',
    soft: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  
  gradients: {
    main: 'linear-gradient(180deg, #0093FF 0%, #FFFFFF 100%)',
    track: (color: string) => `linear-gradient(180deg, ${color} 0%, #FFFFFF 100%)`,
  },
  
  spacing: {
    // Standard spacing scale
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    
    // Custom spacing from Flutter
    trackPadding: '18.2%', // MediaQuery.of(context).size.width * 0.182
  },
  
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Typography styles matching Flutter
export const typography = {
  headline: {
    fontFamily: theme.fonts.teko,
    fontSize: theme.fontSizes['2xl'],
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.textPrimary,
  },
  
  bodyBold: {
    fontFamily: theme.fonts.robotoFlex,
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.textPrimary,
  },
  
  body: {
    fontFamily: theme.fonts.robotoFlex,
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.normal,
    color: theme.colors.textPrimary,
  },
  
  buttonText: {
    fontFamily: theme.fonts.teko,
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.white,
    letterSpacing: theme.letterSpacing.custom4,
  },
  
  hintText: {
    fontFamily: theme.fonts.roboto,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.textHint,
  },
  
  cassetteTitle: {
    fontFamily: theme.fonts.teko,
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.textPrimary,
  },
  
  songTitle: {
    fontFamily: theme.fonts.teko,
    fontSize: theme.fontSizes['4xl'],
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.textPrimary,
    letterSpacing: theme.letterSpacing.custom5,
  },
  
  artistName: {
    fontFamily: theme.fonts.teko,
    fontSize: theme.fontSizes['2xl'],
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.textArtist,
    letterSpacing: theme.letterSpacing.custom2,
  },
  
  albumName: {
    fontFamily: theme.fonts.roboto,
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.textPrimary,
  },
  
  genreText: {
    fontFamily: theme.fonts.roboto,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.normal,
    color: theme.colors.textSecondary,
  },
} as const;

// Component styles
export const components = {
  mainContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    boxShadow: theme.shadows.main,
  },
  
  animatedButton: {
    top: {
      backgroundColor: theme.colors.btnTop,
      borderColor: theme.colors.btnTopBorder,
      borderWidth: '1px',
      borderRadius: theme.borderRadius.default,
    },
    bottom: {
      backgroundColor: theme.colors.btnBottom,
      borderColor: theme.colors.btnTop,
      borderWidth: '1px',
      borderRadius: theme.borderRadius.default,
    },
  },
  
  gradientBackground: {
    background: theme.gradients.main,
  },
  
  albumCover: {
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.album,
  },
  
  circleDecoration: {
    backgroundColor: theme.colors.grayLight,
    borderRadius: theme.borderRadius.full,
  },
  
  platformIcon: {
    borderRadius: theme.borderRadius.full,
    border: `2px solid ${theme.colors.textPrimary}`,
  },
  
  textField: {
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.textHint,
    padding: '8px 12px',
    '&:focus': {
      borderColor: theme.colors.primary,
      outline: 'none',
    },
  },
} as const;

export type Theme = typeof theme;
export type Typography = typeof typography;
export type Components = typeof components;