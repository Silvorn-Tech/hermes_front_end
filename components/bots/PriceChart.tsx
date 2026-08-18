import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Polygon, Rect } from 'react-native-svg';
import { Text } from '../common/Text';
import { Card } from '../common/Card';
import { ChipSelect } from '../common/ChipSelect';
import { ErrorState } from '../common/ErrorState';
import { SkeletonCard } from '../common/LoadingSkeleton';
import { colors, spacing } from '../../constants';
import { BotTrade, Candle } from '../../types';
import { apiClient } from '../../services/api';
import { getErrorMessage } from '../../services/errorMessages';
import { formatPrice, formatClock } from '../../utils/format';

type Interval = '15m' | '1h' | '4h' | '1d';

const INTERVAL_OPTIONS: { value: Interval; label: string }[] = [
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1D' },
];

// A candlestick chart's whole point is showing what just happened, so this
// polls Binance's public klines (via Hermes) on a short interval rather than
// only fetching once -- there is no WebSocket infrastructure in Hermes today
// (see the plan discussed with the user), so this is the pragmatic v1: not
// truly push-based, but frequent enough to read as "live."
const POLL_INTERVAL_MS = 5000;
const CANDLE_LIMIT = 80;
const CHART_HEIGHT = 220;
const Y_AXIS_WIDTH = 58;
const X_AXIS_HEIGHT = 20;

interface Props {
  symbol: string;
  botId: string;
  /** Changes whenever a fill could have happened (mirrors SimulationPanel's
   * own prop of the same name) -- re-fetches the entry/exit markers, since
   * `botId` alone never changes across a Resume/Pause. */
  refreshKey?: string | number;
}

interface ChartGeometry {
  width: number;
  priceMin: number;
  priceMax: number;
  candleSlotWidth: number;
  xForIndex: (index: number) => number;
  yForPrice: (price: number) => number;
}

function buildGeometry(candles: Candle[], trades: BotTrade[], width: number): ChartGeometry {
  const prices = candles.flatMap((c) => [c.high, c.low]);
  const visibleTradePrices = tradesInRange(candles, trades).map((t) => t.fillPrice);
  const allPrices = [...prices, ...visibleTradePrices];
  const rawMin = Math.min(...allPrices);
  const rawMax = Math.max(...allPrices);
  const padding = (rawMax - rawMin) * 0.1 || rawMax * 0.01 || 1;
  const priceMin = rawMin - padding;
  const priceMax = rawMax + padding;
  const candleSlotWidth = width / candles.length;

  return {
    width,
    priceMin,
    priceMax,
    candleSlotWidth,
    xForIndex: (index) => index * candleSlotWidth + candleSlotWidth / 2,
    yForPrice: (price) => CHART_HEIGHT - ((price - priceMin) / (priceMax - priceMin)) * CHART_HEIGHT,
  };
}

/** Only markers that fall inside the currently visible candle window --
 * clamping an old fill to the edge would misrepresent when it happened,
 * so it's better to simply not draw it than to draw it in the wrong place. */
function tradesInRange(candles: Candle[], trades: BotTrade[]): BotTrade[] {
  if (candles.length === 0) return [];
  const start = candles[0].openTime;
  const end = candles[candles.length - 1].closeTime;
  return trades.filter((t) => {
    const ms = new Date(t.terminalAt).getTime();
    return ms >= start && ms <= end;
  });
}

function nearestCandleIndex(candles: Candle[], timestampMs: number): number {
  let closestIndex = 0;
  let closestDiff = Infinity;
  candles.forEach((candle, index) => {
    const diff = Math.abs(candle.openTime - timestampMs);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = index;
    }
  });
  return closestIndex;
}

/**
 * Self-fetching. Draws a candlestick chart for `symbol` with the bot's own
 * entry/exit fills overlaid as markers -- built on `react-native-svg`
 * (already a dependency, see `EquityChart.tsx`'s own precedent) rather
 * than pulling in a dedicated charting library, keeping this dependency-
 * free and fully stylable. Always visible on the bot detail screen (not
 * gated behind pressing Resume) -- that was explicitly what the user asked
 * to change from the original idea.
 */
export function PriceChart({ symbol, botId, refreshKey }: Props) {
  // Not named `interval`/`setInterval` -- that would shadow the global
  // `setInterval` timer function this same component needs for polling.
  const [timeframe, setTimeframe] = useState<Interval>('15m');
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [trades, setTrades] = useState<BotTrade[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getBotTrades(botId)
      .then((result) => {
        if (cancelled) return;
        setTrades(result.available ? result.trades : []);
      })
      .catch(() => {
        // Markers are a nice-to-have overlay on top of the chart -- a
        // failure to load them must never block the chart itself.
        if (!cancelled) setTrades([]);
      });
    return () => {
      cancelled = true;
    };
  }, [botId, refreshKey]);

  useEffect(() => {
    let cancelled = false;

    const load = (isFirstLoadForThisInterval: boolean) => {
      if (isFirstLoadForThisInterval) {
        setStatus('loading');
        setErrorMessage(null);
      }
      apiClient
        .getKlines(symbol, timeframe, CANDLE_LIMIT)
        .then((data) => {
          if (cancelled) return;
          setCandles(data.candles);
          setStatus('success');
        })
        .catch((error) => {
          if (cancelled) return;
          // A failed background poll keeps the last good chart on screen
          // rather than replacing a working view with an error state.
          if (isFirstLoadForThisInterval) {
            setErrorMessage(getErrorMessage(error));
            setStatus('error');
          }
        });
    };

    load(true);
    const timer = setInterval(() => load(false), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [symbol, timeframe, retryToken]);

  const geometry = useMemo(
    () => (candles && containerWidth > 0 ? buildGeometry(candles, trades, containerWidth) : null),
    [candles, trades, containerWidth]
  );

  const visibleTrades = candles ? tradesInRange(candles, trades) : [];
  const lastCandle = candles && candles.length > 0 ? candles[candles.length - 1] : null;
  const firstCandle = candles && candles.length > 0 ? candles[0] : null;
  const priceUp = lastCandle && firstCandle ? lastCandle.close >= firstCandle.open : true;

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text variant="caption" color="muted">
            {symbol}
          </Text>
          {lastCandle ? (
            <Text variant="heading" numeric style={{ color: priceUp ? colors.success : colors.danger }}>
              {formatPrice(lastCandle.close)}
            </Text>
          ) : (
            <Text variant="heading" color="muted">
              …
            </Text>
          )}
        </View>
        <ChipSelect label="Intervalo" options={INTERVAL_OPTIONS} value={timeframe} onChange={setTimeframe} />
      </View>

      {status === 'loading' ? <SkeletonCard lines={5} /> : null}

      {status === 'error' ? (
        <ErrorState
          title="No se pudo cargar el gráfico."
          description={errorMessage ?? undefined}
          onRetry={() => setRetryToken((t) => t + 1)}
        />
      ) : null}

      {status === 'success' && candles ? (
        <View>
          <View style={{ flexDirection: 'row' }}>
            {/* Y-axis price labels, overlaid on plain Views rather than SVG
                text so typography matches the rest of the app exactly. */}
            <View style={{ width: Y_AXIS_WIDTH, height: CHART_HEIGHT, justifyContent: 'space-between' }}>
              {geometry ? (
                <>
                  <Text variant="caption" color="muted" numeric>
                    {formatPrice(geometry.priceMax)}
                  </Text>
                  <Text variant="caption" color="muted" numeric>
                    {formatPrice((geometry.priceMax + geometry.priceMin) / 2)}
                  </Text>
                  <Text variant="caption" color="muted" numeric>
                    {formatPrice(geometry.priceMin)}
                  </Text>
                </>
              ) : null}
            </View>

            <View
              style={{ flex: 1, height: CHART_HEIGHT }}
              onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            >
              {geometry ? (
                <Svg width={geometry.width} height={CHART_HEIGHT}>
                  {/* Gridlines */}
                  <Line x1={0} y1={0} x2={geometry.width} y2={0} stroke={colors.border} strokeWidth={1} />
                  <Line
                    x1={0}
                    y1={CHART_HEIGHT / 2}
                    x2={geometry.width}
                    y2={CHART_HEIGHT / 2}
                    stroke={colors.border}
                    strokeWidth={1}
                    strokeDasharray="2,4"
                  />
                  <Line
                    x1={0}
                    y1={CHART_HEIGHT}
                    x2={geometry.width}
                    y2={CHART_HEIGHT}
                    stroke={colors.border}
                    strokeWidth={1}
                  />

                  {/* Candles */}
                  {candles.map((candle, index) => {
                    const x = geometry.xForIndex(index);
                    const up = candle.close >= candle.open;
                    const color = up ? colors.success : colors.danger;
                    const bodyWidth = Math.max(geometry.candleSlotWidth * 0.6, 1);
                    const bodyTop = geometry.yForPrice(Math.max(candle.open, candle.close));
                    const bodyBottom = geometry.yForPrice(Math.min(candle.open, candle.close));
                    return (
                      <React.Fragment key={candle.openTime}>
                        <Line
                          x1={x}
                          y1={geometry.yForPrice(candle.high)}
                          x2={x}
                          y2={geometry.yForPrice(candle.low)}
                          stroke={color}
                          strokeWidth={1}
                        />
                        <Rect
                          x={x - bodyWidth / 2}
                          y={bodyTop}
                          width={bodyWidth}
                          height={Math.max(bodyBottom - bodyTop, 1)}
                          fill={color}
                        />
                      </React.Fragment>
                    );
                  })}

                  {/* Live price line -- the most recent candle's close */}
                  {lastCandle ? (
                    <Line
                      x1={0}
                      y1={geometry.yForPrice(lastCandle.close)}
                      x2={geometry.width}
                      y2={geometry.yForPrice(lastCandle.close)}
                      stroke={colors.textSecondary}
                      strokeWidth={1}
                      strokeDasharray="4,3"
                    />
                  ) : null}

                  {/* Entry/exit markers */}
                  {visibleTrades.map((trade, i) => {
                    const candleIndex = nearestCandleIndex(candles, new Date(trade.terminalAt).getTime());
                    const x = geometry.xForIndex(candleIndex);
                    const y = geometry.yForPrice(trade.fillPrice);
                    const isBuy = trade.side === 'BUY';
                    const color = isBuy ? colors.success : colors.danger;
                    const size = 6;
                    // Buy = pointing up (entering), Sell = pointing down (exiting).
                    const points = isBuy
                      ? `${x},${y - size} ${x - size},${y + size} ${x + size},${y + size}`
                      : `${x},${y + size} ${x - size},${y - size} ${x + size},${y - size}`;
                    return <Polygon key={`${trade.terminalAt}-${i}`} points={points} fill={color} stroke={colors.background} strokeWidth={1} />;
                  })}
                </Svg>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: Y_AXIS_WIDTH, height: X_AXIS_HEIGHT }}>
            {firstCandle ? (
              <Text variant="caption" color="muted">
                {formatClock(new Date(firstCandle.openTime).toISOString())}
              </Text>
            ) : null}
            {lastCandle ? (
              <Text variant="caption" color="muted">
                {formatClock(new Date(lastCandle.closeTime).toISOString())}
              </Text>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View
                style={{
                  width: 0,
                  height: 0,
                  borderLeftWidth: 5,
                  borderRightWidth: 5,
                  borderBottomWidth: 8,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderBottomColor: colors.success,
                }}
              />
              <Text variant="caption" color="muted">
                Entrada (compra)
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View
                style={{
                  width: 0,
                  height: 0,
                  borderLeftWidth: 5,
                  borderRightWidth: 5,
                  borderTopWidth: 8,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: colors.danger,
                }}
              />
              <Text variant="caption" color="muted">
                Salida (venta)
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </Card>
  );
}
