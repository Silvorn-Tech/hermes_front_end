import React from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import { Text } from '../common/Text';
import { GoogleGlyph } from './GoogleGlyph';
import { colors, radius, spacing } from '../../constants';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Deliberately understated — a premium fintech app doesn't need a
 * marketing-sized OAuth button. Neutral surface, subtle border, the
 * official Google "G" mark as the only accent color on the whole screen.
 */
export function GoogleSignInButton({ label, onPress, loading, disabled }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        alignSelf: 'stretch',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.border : colors.surfaceElevated,
        opacity: isDisabled ? 0.6 : 1,
      })}
    >
      {loading ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <GoogleGlyph size={18} />}
      <Text variant="button" color="primary">
        {label}
      </Text>
    </Pressable>
  );
}
