import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const Colors = {
  bgApp: '#FAFAFA',
  bgWhite: '#FFFFFF',
  bgSurface: '#F5F5F5',
  bgSurfaceHover: '#EFEFEF',
  bgInput: '#FAFAFA',
  bgDark: '#1A1A2E',
  bgCard: '#FFFFFF',
  bgGlass: 'rgba(255,255,255,0.97)',
  bgOverlay: 'rgba(0,0,0,0.4)',

  textPrimary: '#262626',
  textSecondary: '#8E8E8E',
  textTertiary: '#C7C7CC',
  textWhite: '#FFFFFF',
  textLink: '#0095F6',

  brandPrimary: '#0095F6',
  brandPrimaryHover: '#0081D6',
  brandPrimaryLight: '#E8F4FD',
  brandPrimaryBg: '#F0F8FF',
  brandPrimaryDark: '#00376B',

  success: '#00C853',
  successLight: '#E8F5E9',
  successBg: '#F1FFF4',
  warning: '#FF9800',
  warningLight: '#FFF3E0',
  warningBg: '#FFFAF0',
  danger: '#ED4956',
  dangerLight: '#FFEBEE',
  dangerBg: '#FFF5F5',
  info: '#0095F6',
  infoBg: '#E8F4FD',

  purple: '#7C3AED',
  purpleBg: '#F3E8FF',
  orange: '#F97316',
  orangeBg: '#FFF7ED',
  teal: '#14B8A6',
  tealBg: '#F0FDFA',

  borderColor: '#DBDBDB',
  borderLight: '#EFEFEF',
  divider: '#EFEFEF',
  shadowColor: '#000000',
};

export const Typography = {
  largeTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, color: Colors.textPrimary },
  title1: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3, color: Colors.textPrimary },
  title2: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  title3: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  headline: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400', color: Colors.textPrimary },
  callout: { fontSize: 14, fontWeight: '400', color: Colors.textSecondary },
  subhead: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  footnote: { fontSize: 12, fontWeight: '400', color: Colors.textTertiary },
  caption1: { fontSize: 11, fontWeight: '600', color: Colors.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase' },
  mono: { fontSize: 13, fontWeight: '500', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: Colors.textPrimary },
};

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const Radius = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, round: 100 };

export const Shadows = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
};

export const Screen = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };

export const Fonts = {
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  extraBold: { fontWeight: '800' },
};