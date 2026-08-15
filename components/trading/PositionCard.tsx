import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../common/Text';
import { Card } from '../common/Card';
import { colors, spacing, bots as botColors } from '../../constants';
import { Bot, Position } from '../../types';
import { formatDuration, formatPercent, formatPrice, formatSignedCurrency } from '../../utils/format';

interface Props {
  position: Position;
  bot?: Bot;
  onPress?: () => void;
}

export function PositionCard({ position, bot, onPress }: Props) {
  const positive = position.unrealizedPnl >= 0;

  return (
    <Pressable onPress={onPress}>
      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text variant="cardTitle">{position.symbol}</Text>
            <Text
              variant="caption"
              style={{ color: position.direction === 'long' ? colors.success : colors.danger }}
            >
              {position.direction === 'long' ? 'Long' : 'Short'}
            </Text>
          </View>
          <Text variant="cardTitle" numeric style={{ color: positive ? colors.success : colors.danger }}>
            {formatSignedCurrency(position.unrealizedPnl)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: bot ? botColors[bot.id] : colors.textMuted }} />
            <Text variant="caption" color="secondary">
              {bot?.name ?? '—'}
            </Text>
          </View>
          <Text variant="caption" numeric style={{ color: positive ? colors.success : colors.danger }}>
            {formatPercent(position.unrealizedPnlPct, { signed: true })}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text variant="caption" color="muted">
            Entry {formatPrice(position.entryPrice)} → {formatPrice(position.currentPrice)}
          </Text>
          <Text variant="caption" color="muted">
            {formatDuration(position.openedAt)}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}
