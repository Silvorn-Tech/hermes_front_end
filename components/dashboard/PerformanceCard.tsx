import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../common/Text';
import { Card } from '../common/Card';
import { Tabs } from '../common/Tabs';
import { EmptyState } from '../common/EmptyState';
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
  portfolio: Portfolio | null;
}

export function PerformanceCard({ portfolio }: Props) {
  const [period, setPeriod] = useState<EquityPeriod>('1M');
  const curve = portfolio?.equityCurves ? portfolio.equityCurves[period] : null;
  const positive = (curve?.returnPct ?? 0) >= 0;

  return (
    <Card padding="hero" style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text variant="cardTitle">Performance</Text>
        {curve ? <Tabs items={periodItems} activeKey={period} onChange={(k) => setPeriod(k as EquityPeriod)} /> : null}
      </View>

      {curve ? (
        <>
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
        </>
      ) : (
        <EmptyState
          title="Histórico de rendimiento aún no disponible."
          description="Hermes todavía no guarda snapshots de portfolio en el tiempo."
        />
      )}
    </Card>
  );
}
