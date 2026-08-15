import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing, motion } from '../../constants';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const variantStyles: Record<Variant, { bg: string; bgPressed: string; border?: string; text: string }> = {
  primary: { bg: colors.brand, bgPressed: '#43769c', text: colors.textPrimary },
  secondary: { bg: colors.surfaceElevated, bgPressed: colors.border, border: colors.border, text: colors.textPrimary },
  ghost: { bg: 'transparent', bgPressed: colors.surfaceElevated, text: colors.textSecondary },
  danger: { bg: colors.danger, bgPressed: '#c33f3c', text: colors.textPrimary },
};

export function Button({ label, onPress, variant = 'primary', disabled, fullWidth, style }: Props) {
  const v = variantStyles[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? v.bgPressed : v.bg,
          borderRadius: radius.md,
          paddingVertical: spacing.md - 2,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      <Text variant="button" style={{ color: v.text }}>
        {label}
      </Text>
    </Pressable>
  );
}
