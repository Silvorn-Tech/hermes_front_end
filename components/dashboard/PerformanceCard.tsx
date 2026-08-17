import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../common/Text';
import { Card } from '../common/Card';
import { Tabs } from '../common/Tabs';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { SkeletonCard } from '../common/LoadingSkeleton';
import { EquityChart } from './EquityChart';
import { colors, spacing } from '../../constants';
import { EquityCurve, EquityPeriod } from '../../types';
import { formatPercent } from '../../utils/format';
import { apiClient } from '../../services/api';
import { getErrorMessage } from '../../services/errorMessages';

const periodItems = [
  { key: '7D', label: '7D' },
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: '1Y', label: '1Y' },
];

type Status = 'loading' | 'success' | 'empty' | 'error';

/** Self-fetching: fetches its own history from GET /portfolio/history on
 * mount and whenever the period tab changes, rather than depending on the
 * Dashboard's `portfolio` object (which no longer carries equity curves —
 * see types/portfolio.ts). Mirrors new-order.tsx's market-data lookup:
 * explicit fetch on a dependency change, no polling, cancellation-guarded. */
export function PerformanceCard() {
  const [period, setPeriod] = useState<EquityPeriod>('1M');
  const [status, setStatus] = useState<Status>('loading');
  const [curve, setCurve] = useState<EquityCurve | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setErrorMessage(null);

    apiClient
      .getPortfolioHistory(period)
      .then((result) => {
        if (cancelled) return;
        setCurve(result);
        setStatus(result.points.length >= 2 ? 'success' : 'empty');
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(getErrorMessage(error));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [period, retryToken]);

  const positive = (curve?.returnPct ?? 0) >= 0;

  return (
    <Card padding="hero" style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text variant="cardTitle">Performance</Text>
        <Tabs items={periodItems} activeKey={period} onChange={(k) => setPeriod(k as EquityPeriod)} />
      </View>

      {status === 'loading' ? (
        <SkeletonCard lines={2} />
      ) : status === 'error' ? (
        <ErrorState
          title="No se pudo cargar el histórico."
          description={errorMessage ?? undefined}
          onRetry={() => setRetryToken((t) => t + 1)}
        />
      ) : status === 'success' && curve ? (
        <>
          <EquityChart points={curve.points} color={positive ? colors.success : colors.danger} />

          <View style={{ flexDirection: 'row', gap: spacing.xxl }}>
            <View>
              <Text variant="caption" color="muted">
                Retorno del período
              </Text>
              <Text variant="heading" numeric style={{ color: positive ? colors.success : colors.danger }}>
                {curve.returnPct !== null ? formatPercent(curve.returnPct, { signed: true }) : '—'}
              </Text>
            </View>
            {curve.maxDrawdownPct !== null ? (
              <View>
                <Text variant="caption" color="muted">
                  Drawdown máximo
                </Text>
                <Text variant="heading" numeric style={{ color: colors.danger }}>
                  {formatPercent(curve.maxDrawdownPct, { decimals: 1 })}
                </Text>
              </View>
            ) : null}
          </View>
        </>
      ) : (
        <EmptyState
          title="Histórico de rendimiento aún no disponible."
          description="Todavía no hay suficientes snapshots de portfolio guardados para este período."
        />
      )}
    </Card>
  );
}
