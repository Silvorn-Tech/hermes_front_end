import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing } from '../../constants';

interface Props {
  label: string;
  tone: string;
  subtle?: boolean;
}

/** Generic single-accent status pill. `tone` is the accent color — never mix accents within one badge. */
export function Badge({ label, tone, subtle = true }: Props) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.full,
        backgroundColor: subtle ? withAlpha(tone, 0.14) : tone,
        borderWidth: 1,
        borderColor: subtle ? withAlpha(tone, 0.3) : tone,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: radius.full, backgroundColor: tone }} />
      <Text variant="caption" style={{ color: subtle ? tone : colors.background }}>
        {label}
      </Text>
    </View>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export { withAlpha };
