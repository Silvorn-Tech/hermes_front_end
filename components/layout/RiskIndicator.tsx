import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../common/Text';
import { riskLevelColor, riskLevelLabel } from '../risk/RiskState';
import { colors, radius, spacing } from '../../constants';
import { RiskLevel } from '../../types';

interface Props {
  level: RiskLevel;
}

/** Global header entry point into Risk — the only way mobile reaches the Risk screen. */
export function RiskIndicator({ level }: Props) {
  const router = useRouter();
  const color = riskLevelColor[level];
  const isQuiet = level === 'normal';

  return (
    <Pressable
      onPress={() => router.push('/risk')}
      accessibilityRole="button"
      accessibilityLabel={`Risk: ${riskLevelLabel[level]}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: 6,
        paddingHorizontal: spacing.sm + 2,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: isQuiet ? colors.border : color,
        backgroundColor: isQuiet ? 'transparent' : `${color}1A`,
      }}
    >
      <View style={{ width: 7, height: 7, borderRadius: radius.full, backgroundColor: color }} />
      <Text variant="caption" color={isQuiet ? 'muted' : undefined} style={!isQuiet ? { color } : undefined}>
        {riskLevelLabel[level]}
      </Text>
    </Pressable>
  );
}
