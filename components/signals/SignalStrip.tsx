import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../common/Text';
import { colors, radius, spacing } from '../../constants';
import { Signal, SignalLevel } from '../../types';

const levelColor: Record<SignalLevel, string> = {
  ambient: colors.textMuted,
  insight: colors.aiAccent,
  signal: colors.aiAccent,
  alert: colors.risk.alert,
  action_required: colors.risk.critical,
};

interface Props {
  signal: Signal;
  onPress?: () => void;
}

/** Single-line ambient strip surfacing Hermes' most relevant current interpretation. */
export function SignalStrip({ signal, onPress }: Props) {
  const color = levelColor[signal.level];
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: signal.level === 'action_required' ? color : colors.border,
        }}
      >
        <Ionicons name="sparkles" size={14} color={color} />
        <Text variant="body" color="secondary" style={{ flex: 1 }} numberOfLines={1}>
          {signal.body}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}
