import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../common/Text';
import { Card } from '../common/Card';
import { Tabs } from '../common/Tabs';
import { EquityChart } from './EquityChart';
import { colors, spacing } from '../../constants';
import { EquityPeriod, Portfolio } from '../../types';
import { formatPercent } from '../../utils/format';

const periodItems = [
  { key: '7D', label: '7D' },
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: '1Y', label: '1Y' },
];

interface Props {
  portfolio: Portfolio;
}

export function PerformanceCard({ portfolio }: Props) {
  const [period, setPeriod] = useState<EquityPeriod>('1M');
  const curve = portfolio.equityCurves[period];
  const positive = curve.returnPct >= 0;

  return (
    <Card padding="hero" style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text variant="cardTitle">Performance</Text>
        <Tabs items={periodItems} activeKey={period} onChange={(k) => setPeriod(k as EquityPeriod)} />
      </View>

      <EquityChart points={curve.points} color={positive ? colors.success : colors.danger} />

      <View style={{ flexDirection: 'row', gap: spacing.xxl }}>
        <View>
          <Text variant="caption" color="muted">
            Retorno del período
          </Text>
          <Text variant="heading" numeric style={{ color: positive ? colors.success : colors.danger }}>
            {formatPercent(curve.returnPct, { signed: true })}
          </Text>
        </View>
        <View>
          <Text variant="caption" color="muted">
            Win rate
          </Text>
          <Text variant="heading" numeric>
            {formatPercent(curve.winRatePct, { decimals: 0 })}
          </Text>
        </View>
      </View>
    </Card>
  );
}
