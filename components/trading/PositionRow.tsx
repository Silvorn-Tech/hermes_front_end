import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../common/Text';
import { colors, spacing, bots as botColors } from '../../constants';
import { Bot, Position } from '../../types';
import { formatCurrency, formatDuration, formatPrice, formatSignedCurrency } from '../../utils/format';

interface Props {
  position: Position;
  bot?: Bot;
  density: 'comfortable' | 'compact';
  onPress?: () => void;
}

const col = { symbol: 1.1, direction: 0.8, bot: 1.1, size: 0.9, price: 1, pnl: 1.2, duration: 0.8 };

export function PositionRow({ position, bot, density, onPress }: Props) {
  const positive = position.unrealizedPnl >= 0;
  const vPad = density === 'compact' ? spacing.xs + 2 : spacing.md;

  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: vPad,
          paddingHorizontal: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text variant="body" style={{ flex: col.symbol }} numeric>
          {position.symbol}
        </Text>
        <Text
          variant="caption"
          style={{ flex: col.direction, color: position.direction === 'long' ? colors.success : colors.danger }}
        >
          {position.direction === 'long' ? 'Long' : 'Short'}
        </Text>
        <View style={{ flex: col.bot, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: bot ? botColors[bot.id] : colors.textMuted }} />
          <Text variant="body" color="secondary">
            {bot?.name ?? '—'}
          </Text>
        </View>
        <Text variant="body" color="secondary" numeric style={{ flex: col.size }}>
          {position.size}
        </Text>
        <Text variant="body" color="secondary" numeric style={{ flex: col.price }}>
          {formatPrice(position.entryPrice)}
        </Text>
        <Text variant="body" numeric style={{ flex: col.price }}>
          {formatPrice(position.currentPrice)}
        </Text>
        <View style={{ flex: col.pnl }}>
          <Text variant="body" numeric style={{ color: positive ? colors.success : colors.danger }}>
            {formatSignedCurrency(position.unrealizedPnl)}
          </Text>
        </View>
        <Text variant="caption" color="muted" numeric style={{ flex: col.duration }}>
          {formatDuration(position.openedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

export function PositionTableHeader() {
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text variant="caption" color="muted" style={{ flex: col.symbol }}>
        Symbol
      </Text>
      <Text variant="caption" color="muted" style={{ flex: col.direction }}>
        Direction
      </Text>
      <Text variant="caption" color="muted" style={{ flex: col.bot }}>
        Bot
      </Text>
      <Text variant="caption" color="muted" style={{ flex: col.size }}>
        Size
      </Text>
      <Text variant="caption" color="muted" style={{ flex: col.price }}>
        Entry
      </Text>
      <Text variant="caption" color="muted" style={{ flex: col.price }}>
        Current
      </Text>
      <Text variant="caption" color="muted" style={{ flex: col.pnl }}>
        Unrealized P&L
      </Text>
      <Text variant="caption" color="muted" style={{ flex: col.duration }}>
        Duration
      </Text>
    </View>
  );
}
