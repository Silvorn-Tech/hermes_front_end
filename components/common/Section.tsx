import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { spacing } from '../../constants';

interface Props {
  title: string;
  children: React.ReactNode;
}

/** Consistent section header used by sequential detail screens (Risk, Bot detail). */
export function Section({ title, children }: Props) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="caption" color="muted" style={{ letterSpacing: 0.5 }}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}
