import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { colors, spacing } from '../../constants';

type Variant = 'preview' | 'pending';

interface Props {
  variant: Variant;
  label: string;
  description?: string;
}

const variantTone: Record<Variant, string> = {
  preview: colors.textMuted,
  pending: colors.warning,
};

/**
 * Small persistent banner marking content as either demo/preview data
 * (`variant="preview"` — content renders normally but isn't backend-sourced)
 * or a blocked action result (`variant="pending"` — the action was attempted
 * but there's no backend to fulfill it yet). Never used to imply something
 * partially works; either the screen is real or it's clearly labeled.
 */
export function PreviewBanner({ variant, label, description }: Props) {
  const tone = variantTone[variant];
  return (
    <Card style={{ gap: description ? spacing.xs : 0, backgroundColor: colors.surfaceElevated }} borderColor={tone}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone }} />
        <Text variant="caption" style={{ color: tone }}>
          {label}
        </Text>
      </View>
      {description ? (
        <Text variant="caption" color="muted">
          {description}
        </Text>
      ) : null}
    </Card>
  );
}
