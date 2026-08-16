import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../common/Text';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { colors, spacing, bots as botColors } from '../../constants';
import { Bot, BotId, Position } from '../../types';
import { formatOrDash, formatPercent, formatSignedCurrency } from '../../utils/format';

interface Props {
  positions: Position[];
  getBotById: (id: BotId | undefined) => Bot | undefined;
}

/** Portfolio-feel summary — a handful of rows, not a dense trading table. */
export function PositionsSummary({ positions, getBotById }: Props) {
  const router = useRouter();
  const shown = positions.slice(0, 4);

  return (
    <Card padding="hero" style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="cardTitle">Positions</Text>
        <Pressable onPress={() => router.push('/trading')}>
          <Text variant="caption" style={{ color: colors.brand }}>
            Ver todas
          </Text>
        </Pressable>
      </View>

      {shown.length === 0 ? (
        <EmptyState title="No hay posiciones abiertas." />
      ) : (
        <View style={{ gap: 0 }}>
          {shown.map((position, i) => {
            const bot = getBotById(position.botId);
            const positive = (position.unrealizedPnl ?? 0) >= 0;
            return (
              <Pressable key={position.id} onPress={() => router.push(`/trading/position/${position.id}` as any)}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: spacing.sm + 2,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: bot ? botColors[bot.riskProfile] : colors.textMuted }} />
                    <Text variant="body">{position.symbol}</Text>
                    <Text variant="caption" color="muted">
                      {position.direction === 'long' ? 'Long' : 'Short'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="body" numeric style={{ color: positive ? colors.success : colors.danger }}>
                      {formatOrDash(position.unrealizedPnl, formatSignedCurrency)}
                    </Text>
                    <Text variant="caption" color="muted" numeric>
                      {formatOrDash(position.unrealizedPnlPct, (v) => formatPercent(v, { signed: true }))}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}
