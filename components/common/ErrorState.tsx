import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { colors, spacing } from '../../constants';

interface Props {
  title: string;
  description?: string;
  onRetry?: () => void;
}

/** A resource's fetch itself failed (network/backend error) — distinct from
 * EmptyState, which is for "the fetch succeeded and there's nothing to
 * show." Never used to render a raw backend error string; callers pass
 * copy from services/errorMessages.ts. */
export function ErrorState({ title, description, onRetry }: Props) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxxl,
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
      }}
    >
      <Text variant="cardTitle" style={{ color: colors.danger, textAlign: 'center' }}>
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
          {description}
        </Text>
      ) : null}
      {onRetry ? (
        <Button label="Reintentar" variant="secondary" onPress={onRetry} style={{ marginTop: spacing.sm }} />
      ) : null}
    </View>
  );
}
