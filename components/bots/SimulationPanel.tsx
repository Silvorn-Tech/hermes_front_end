import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../common/Text';
import { Card } from '../common/Card';
import { ErrorState } from '../common/ErrorState';
import { SkeletonCard } from '../common/LoadingSkeleton';
import { colors, spacing } from '../../constants';
import { BotPerformance, BotPortfolio } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/format';
import { apiClient } from '../../services/api';
import { getErrorMessage } from '../../services/errorMessages';

type Status = 'loading' | 'success' | 'error';

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant="body" color="muted">
        {label}
      </Text>
      <Text variant="body" numeric style={tone ? { color: tone } : undefined}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Self-fetching, like PerformanceCard: fetches GET /bots/{id}/portfolio and
 * GET /bots/{id}/performance on mount, independently of the account-wide
 * `portfolio` in HermesDataContext — this bot's virtual ledger is a
 * different balance sheet entirely, never summed with the real one. Only
 * ever rendered for a SIMULATION bot (see BotDetailScreen); a LIVE bot's
 * 409 `{available: false}` response is handled here too, defensively, in
 * case that ever changes.
 *
 * `refreshKey` must change whenever a fill could have happened (pause/
 * resume) — `botId` alone never does, since it's the same bot before and
 * after a Resume, so without this the card kept showing whatever it
 * fetched on first mount (e.g. $10,000 cash, $0 position) even after a
 * real fill updated the backend's numbers. `BotDetailScreen` passes
 * `bot.currentQuantity`, the one field that reliably changes exactly when
 * a fill does.
 */
export function SimulationPanel({ botId, refreshKey }: { botId: string; refreshKey?: string | number }) {
  const [status, setStatus] = useState<Status>('loading');
  const [portfolio, setPortfolio] = useState<BotPortfolio | null>(null);
  const [performance, setPerformance] = useState<BotPerformance | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setErrorMessage(null);

    Promise.all([apiClient.getBotPortfolio(botId), apiClient.getBotPerformance(botId)])
      .then(([p, perf]) => {
        if (cancelled) return;
        setPortfolio(p);
        setPerformance(perf);
        setStatus('success');
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(getErrorMessage(error));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [botId, refreshKey, retryToken]);

  if (status === 'loading') {
    return <SkeletonCard lines={4} />;
  }

  if (status === 'error') {
    return (
      <ErrorState
        title="No se pudo cargar el portfolio simulado."
        description={errorMessage ?? undefined}
        onRetry={() => setRetryToken((t) => t + 1)}
      />
    );
  }

  if (!portfolio?.available || !performance?.available) {
    return (
      <Card style={{ gap: spacing.sm }}>
        <Text variant="body" color="muted">
          {(!portfolio?.available && portfolio?.reason) ||
            (!performance?.available && performance?.reason) ||
            'No disponible.'}
        </Text>
      </Card>
    );
  }

  const returnPositive = (portfolio.returnPct ?? 0) >= 0;

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text variant="caption" color="muted">
            Valor total (virtual)
          </Text>
          <Text variant="heading" numeric>
            {formatCurrency(portfolio.totalValueQuote)} {portfolio.quoteAsset}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="caption" color="muted">
            Retorno
          </Text>
          <Text
            variant="heading"
            numeric
            style={{ color: portfolio.returnPct === null ? colors.textMuted : returnPositive ? colors.success : colors.danger }}
          >
            {portfolio.returnPct !== null ? formatPercent(portfolio.returnPct, { signed: true }) : '—'}
          </Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: colors.border }} />

      <Row label="Efectivo virtual" value={`${formatCurrency(portfolio.cashBalanceQuote)} ${portfolio.quoteAsset}`} />
      <Row label="Valor de posición" value={`${formatCurrency(portfolio.positionValueQuote)} ${portfolio.quoteAsset}`} />
      <Row label="Exposición" value={formatPercent(portfolio.exposurePct)} />
      <Row
        label="Drawdown máximo"
        value={performance.maxDrawdownPct !== null ? formatPercent(performance.maxDrawdownPct) : '—'}
        tone={performance.maxDrawdownPct !== null ? colors.danger : undefined}
      />
      <Row
        label="P&L realizado hoy"
        value={`${formatCurrency(performance.realizedPnlTodayQuote)} ${portfolio.quoteAsset}`}
        tone={performance.realizedPnlTodayQuote >= 0 ? colors.success : colors.danger}
      />
      <Row label="Operaciones cerradas" value={String(performance.tradeCount)} />
      <Row label="Win rate" value={performance.winRatePct !== null ? formatPercent(performance.winRatePct) : '—'} />

      <Text variant="caption" color="muted">
        Capital y posiciones virtuales — nunca dinero real, nunca sumado al portfolio real.
      </Text>
    </Card>
  );
}
