import { Platform, TextStyle } from 'react-native';

/**
 * Inter is loaded at app boot via useInterFonts() (see hooks/useAppFonts.ts).
 * Weight-specific families are required because React Native does not
 * synthesize font weights on native platforms.
 */
export const fontFamily = {
  regular: Platform.select({ web: 'Inter_400Regular, Inter, sans-serif', default: 'Inter_400Regular' }),
  medium: Platform.select({ web: 'Inter_500Medium, Inter, sans-serif', default: 'Inter_500Medium' }),
  semiBold: Platform.select({ web: 'Inter_600SemiBold, Inter, sans-serif', default: 'Inter_600SemiBold' }),
} as const;

type TypeScale = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'fontWeight'>;

export const type: Record<
  'display' | 'heading' | 'cardTitle' | 'body' | 'caption' | 'button',
  TypeScale
> = {
  display: { fontFamily: fontFamily.semiBold, fontSize: 34, lineHeight: 40, fontWeight: '600' },
  heading: { fontFamily: fontFamily.semiBold, fontSize: 22, lineHeight: 28, fontWeight: '600' },
  cardTitle: { fontFamily: fontFamily.semiBold, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16, fontWeight: '500' },
  button: { fontFamily: fontFamily.semiBold, fontSize: 14, lineHeight: 20, fontWeight: '600' },
};

/** Tabular numerals for all financial figures (prices, P&L, percentages). */
export const numeric: TextStyle = Platform.select({
  web: { fontVariant: ['tabular-nums'] },
  default: { fontVariant: ['tabular-nums'] },
}) as TextStyle;
