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
 * Self-fetching, mirrors SimulationPanel's shape exactly, but for a LIVE
 * bot's real Binance position and order history. Only ever rendered for
 * a LIVE bot (see BotDetailScreen) — a SIMULATION bot's 409/available:false
 * response is handled here too, defensively, in case that ever changes.
 *
 * Deliberately smaller than SimulationPanel: no "efectivo virtual" (no
 * cash concept — a LIVE bot trades against the user's one shared real
 * Binance balance, not a ring-fenced virtual bankroll) and no
 * "exposición" (same reason). Retorno and Drawdown máximo always render
 * `—`, never a fabricated number — no per-bot capital baseline or
 * time-series snapshot exists yet to compute them against.
 */
export function LivePanel({ botId, refreshKey }: { botId: string; refreshKey?: string | number }) {
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
        title="No se pudo cargar el portfolio en vivo."
        description={errorMessage ?? undefined}
        onRetry={() => setRetryToken((t) => t + 1)}
      />
    );
  }

  if (
    !portfolio?.available ||
    !performance?.available ||
    portfolio.executionMode !== 'LIVE' ||
    performance.executionMode !== 'LIVE'
  ) {
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

  return (
    <Card style={{ gap: spacing.md }}>
      <View>
        <Text variant="caption" color="muted">
          Valor de posición (real)
        </Text>
        <Text variant="heading" numeric>
          {formatCurrency(portfolio.totalValueQuote)} {portfolio.quoteAsset}
        </Text>
      </View>

      <View style={{ height: 1, backgroundColor: colors.border }} />

      <Row label="Cantidad" value={String(portfolio.currentQuantity)} />
      <Row label="Retorno" value="—" />
      <Row label="Drawdown máximo" value="—" />
      <Row
        label="P&L realizado hoy"
        value={`${formatCurrency(performance.realizedPnlTodayQuote)} ${portfolio.quoteAsset}`}
        tone={performance.realizedPnlTodayQuote >= 0 ? colors.success : colors.danger}
      />
      <Row label="Operaciones cerradas" value={String(performance.tradeCount)} />
      <Row label="Win rate" value={performance.winRatePct !== null ? formatPercent(performance.winRatePct) : '—'} />

      <Text variant="caption" color="muted">
        Dinero real — operado en tu cuenta de Binance conectada.
      </Text>
    </Card>
  );
}
