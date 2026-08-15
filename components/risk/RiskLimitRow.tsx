import React from 'react';
import { View } from 'react-native';
import { Text } from '../common/Text';
import { colors, radius, spacing } from '../../constants';
import { RiskLimitItem } from '../../types';
import { formatPercent } from '../../utils/format';

interface Props {
  item: RiskLimitItem;
}

/** Quiet by default. Only gains color/emphasis when the limit is actually breached. */
export function RiskLimitRow({ item }: Props) {
  const breached = item.currentPct > item.limitPct;
  const clamped = Math.min(100, (item.currentPct / item.limitPct) * 100);

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="body" color={breached ? 'primary' : 'secondary'}>
          {item.label}
        </Text>
        <Text
          variant="body"
          numeric
          style={breached ? { color: colors.risk.critical } : undefined}
          color={breached ? undefined : 'secondary'}
        >
          {formatPercent(item.currentPct, { decimals: 1 })} / {formatPercent(item.limitPct, { decimals: 1 })}
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: radius.full, backgroundColor: colors.surfaceElevated, overflow: 'hidden' }}>
        <View
          style={{
            width: `${clamped}%`,
            height: '100%',
            borderRadius: radius.full,
            backgroundColor: breached ? colors.risk.critical : colors.textMuted,
          }}
        />
      </View>
    </View>
  );
}
