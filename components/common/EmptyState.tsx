import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { colors, spacing } from '../../constants';

interface Props {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

/** Contextual empty state — every screen supplies its own copy, never a generic fallback. */
export function EmptyState({ title, description, icon }: Props) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.sm }}>
      {icon}
      <Text variant="cardTitle" color="secondary" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}
