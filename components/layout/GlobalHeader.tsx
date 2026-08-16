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
  const dailyPnl = portfolio?.dailyPnl ?? null;
  const dailyPnlPct = portfolio?.dailyPnlPct ?? null;
  const positive = (dailyPnl ?? 0) >= 0;

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
            {portfolio ? formatCurrency(portfolio.totalValueQuote) : '—'}
          </Text>
        </View>
        {isDesktop ? (
          <View>
            <Text variant="caption" color="muted">
              Daily P&amp;L
            </Text>
            {dailyPnl !== null && dailyPnlPct !== null ? (
              <Text variant="cardTitle" numeric style={{ color: positive ? colors.success : colors.danger }}>
                {formatSignedCurrency(dailyPnl)} ({formatPercent(dailyPnlPct, { signed: true })})
              </Text>
            ) : (
              <Text variant="cardTitle" color="muted">
                No disponible aún
              </Text>
            )}
          </View>
        ) : null}
      </View>

      <RiskIndicator level={risk.level} />
    </View>
  );
}
