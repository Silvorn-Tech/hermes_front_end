import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { colors, type as typeScale, numeric } from '../../constants';

export type TextVariant = 'display' | 'heading' | 'cardTitle' | 'body' | 'caption' | 'button';
export type TextColor = 'primary' | 'secondary' | 'muted' | 'inherit';

interface Props extends TextProps {
  variant?: TextVariant;
  color?: TextColor;
  numeric?: boolean;
  style?: TextStyle | TextStyle[];
}

const colorMap: Record<Exclude<TextColor, 'inherit'>, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
};

export function Text({ variant = 'body', color = 'primary', numeric: isNumeric, style, ...rest }: Props) {
  const colorStyle = color === 'inherit' ? null : { color: colorMap[color] };
  return (
    <RNText
      {...rest}
      style={[typeScale[variant], colorStyle, isNumeric ? numeric : null, style]}
    />
  );
}
