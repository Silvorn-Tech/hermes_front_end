import React from 'react';
import { View } from 'react-native';
import { Badge } from '../common/Badge';
import { Text } from '../common/Text';
import { colors, radius, spacing } from '../../constants';
import { RiskLevel } from '../../types';

export const riskLevelLabel: Record<RiskLevel, string> = {
  normal: 'Normal',
  elevated: 'Elevado',
  alert: 'Alerta',
  critical: 'Crítico',
};

export const riskLevelColor: Record<RiskLevel, string> = {
  normal: colors.risk.normal,
  elevated: colors.risk.elevated,
  alert: colors.risk.alert,
  critical: colors.risk.critical,
};

interface BadgeProps {
  level: RiskLevel;
}

export function RiskStateBadge({ level }: BadgeProps) {
  return <Badge label={riskLevelLabel[level]} tone={riskLevelColor[level]} />;
}

interface DotProps {
  level: RiskLevel;
  size?: number;
}

export function RiskStateDot({ level, size = 8 }: DotProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        backgroundColor: riskLevelColor[level],
      }}
    />
  );
}

interface RowProps {
  label: string;
  level: RiskLevel;
}

/** Label + colored state, used for "risk by bot" style rows. Silent unless the level demands attention. */
export function RiskStateRow({ label, level }: RowProps) {
  const emphasized = level === 'alert' || level === 'critical';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm }}>
      <Text variant="body" color={emphasized ? 'primary' : 'secondary'}>
        {label}
      </Text>
      <RiskStateBadge level={level} />
    </View>
  );
}
