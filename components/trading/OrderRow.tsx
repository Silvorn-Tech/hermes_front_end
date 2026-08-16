import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../common/Text';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { colors, spacing, bots as botColors } from '../../constants';
import { Bot, Order } from '../../types';
import { formatClock, formatOrDash, formatPrice } from '../../utils/format';
import { orderStatusLabel, orderStatusTone, orderTypeLabel } from '../../utils/orderDisplay';

interface Props {
  order: Order;
  bot?: Bot;
  onPress?: () => void;
}

const col = { symbol: 1.1, type: 0.9, status: 1, bot: 1.1, size: 0.8, price: 1, time: 0.9 };

export function OrderRow({ order, bot, onPress }: Props) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text variant="body" style={{ flex: col.symbol }}>
          {order.symbol}
        </Text>
        <Text variant="body" color="secondary" style={{ flex: col.type }}>
          {orderTypeLabel[order.type]}
        </Text>
        <View style={{ flex: col.status }}>
          <Badge label={orderStatusLabel[order.status]} tone={orderStatusTone[order.status]} />
        </View>
        <View style={{ flex: col.bot, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: bot ? botColors[bot.id] : colors.textMuted }} />
          <Text variant="body" color="secondary">
            {bot?.name ?? '—'}
          </Text>
        </View>
        <Text variant="body" color="secondary" numeric style={{ flex: col.size }}>
          {order.size}
        </Text>
        <Text variant="body" numeric style={{ flex: col.price }}>
          {order.type === 'MARKET' ? 'Market' : formatOrDash(order.price, formatPrice)}
        </Text>
        <Text variant="caption" color="muted" numeric style={{ flex: col.time }}>
          {formatClock(order.timestamp)}
        </Text>
      </View>
    </Pressable>
  );
}

export function OrderTableHeader() {
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
      <Text variant="caption" color="muted" style={{ flex: col.type }}>
        Order Type
      </Text>
      <Text variant="caption" color="muted" style={{ flex: col.status }}>
        Status
      </Text>
      <Text variant="caption" color="muted" style={{ flex: col.bot }}>
        Bot
      </Text>
      <Text variant="caption" color="muted" style={{ flex: col.size }}>
        Size
      </Text>
      <Text variant="caption" color="muted" style={{ flex: col.price }}>
        Price
      </Text>
      <Text variant="caption" color="muted" style={{ flex: col.time }}>
        Timestamp
      </Text>
    </View>
  );
}

export function OrderCard({ order, bot, onPress }: Props) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="cardTitle">{order.symbol}</Text>
          <Badge label={orderStatusLabel[order.status]} tone={orderStatusTone[order.status]} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="caption" color="secondary">
            {orderTypeLabel[order.type]} · {bot?.name ?? '—'}
          </Text>
          <Text variant="caption" color="muted">
            {formatClock(order.timestamp)}
          </Text>
        </View>
        <Text variant="body" numeric>
          {order.size} @ {order.type === 'MARKET' ? 'Market' : formatOrDash(order.price, formatPrice)}
        </Text>
      </Card>
    </Pressable>
  );
}
