import React from 'react';
import { View } from 'react-native';
import { Text } from '../common/Text';
import { colors, radius, spacing } from '../../constants';
import { formatPercent } from '../../utils/format';

interface Props {
  pct: number;
  limitPct?: number;
  color: string;
  label?: string;
}

/** Horizontal exposure meter. Turns danger-colored only when the limit is actually exceeded. */
export function ExposureBar({ pct, limitPct, color, label = 'Exposure' }: Props) {
  const isOverLimit = limitPct !== undefined && pct > limitPct;
  const fillColor = isOverLimit ? colors.danger : color;
  const clampedPct = Math.min(100, pct);

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="caption" color="muted">
          {label}
        </Text>
        <Text variant="caption" numeric color={isOverLimit ? undefined : 'secondary'} style={isOverLimit ? { color: colors.danger } : undefined}>
          {formatPercent(pct, { decimals: 0 })}
          {limitPct !== undefined ? ` / ${formatPercent(limitPct, { decimals: 0 })} límite` : ''}
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: radius.full, backgroundColor: colors.surfaceElevated, overflow: 'hidden' }}>
        <View style={{ width: `${clampedPct}%`, height: '100%', borderRadius: radius.full, backgroundColor: fillColor }} />
        {limitPct !== undefined && limitPct < 100 ? (
          <View
            style={{
              position: 'absolute',
              left: `${Math.min(100, limitPct)}%`,
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: colors.textMuted,
            }}
          />
        ) : null}
      </View>
    </View>
  );
}
