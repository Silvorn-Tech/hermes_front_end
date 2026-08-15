import React from 'react';
import { View } from 'react-native';
import { Text } from '../common/Text';
import { RiskIndicator } from './RiskIndicator';
import { colors, spacing, HEADER_HEIGHT } from '../../constants';
import { useHermesData } from '../../hooks/HermesDataContext';
import { useResponsive } from '../../hooks/useResponsive';
import { formatCurrency, formatPercent, formatSignedCurrency } from '../../utils/format';

export function GlobalHeader() {
  const { portfolio, risk } = useHermesData();
  const { isDesktop } = useResponsive();
  const positive = portfolio.dailyPnl >= 0;

  return (
    <View
      style={{
        height: HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.lg }}>
        <View>
          <Text variant="caption" color="muted">
            Balance
          </Text>
          <Text variant={isDesktop ? 'cardTitle' : 'body'} numeric>
            {formatCurrency(portfolio.balance)}
          </Text>
        </View>
        {isDesktop ? (
          <View>
            <Text variant="caption" color="muted">
              Daily P&amp;L
            </Text>
            <Text variant="cardTitle" numeric style={{ color: positive ? colors.success : colors.danger }}>
              {formatSignedCurrency(portfolio.dailyPnl)} ({formatPercent(portfolio.dailyPnlPct, { signed: true })})
            </Text>
          </View>
        ) : null}
      </View>

      <RiskIndicator level={risk.level} />
    </View>
  );
}
