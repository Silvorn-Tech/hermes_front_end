import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../common/Text';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { BotGlyph } from './BotGlyph';
import { colors, spacing } from '../../constants';
import { Bot } from '../../types';

const statusLabel: Record<Bot['status'], string> = {
  ACTIVE: 'Activo',
  PAUSING: 'Pausando…',
  PAUSED: 'Pausado',
  RESUMING: 'Reanudando…',
  STOPPED: 'Detenido',
  ERROR: 'Error',
};

const statusTone: Record<Bot['status'], string> = {
  ACTIVE: colors.success,
  PAUSING: colors.warning,
  PAUSED: colors.textMuted,
  RESUMING: colors.warning,
  STOPPED: colors.textMuted,
  ERROR: colors.danger,
};

const assetClassLabel: Record<Bot['assetClass'], string> = {
  CRYPTO: 'Crypto',
  EQUITY: 'Equity',
};

interface Props {
  bot: Bot;
  variant?: 'compact' | 'full';
  onPress?: () => void;
}

export function BotCard({ bot, variant = 'full', onPress }: Props) {
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <BotGlyph riskProfile={bot.riskProfile} active={bot.status === 'ACTIVE'} />
      <View style={{ flex: 1 }}>
        <Text variant="cardTitle">{bot.name}</Text>
        <Text variant="caption" color="muted">
          {assetClassLabel[bot.assetClass]} · {bot.instrument}
        </Text>
      </View>
      <Badge label={statusLabel[bot.status]} tone={statusTone[bot.status]} />
    </View>
  );

  if (variant === 'compact') {
    return (
      <Pressable onPress={onPress}>
        <Card style={{ gap: spacing.md }}>
          {header}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" color="muted">
              Cantidad actual
            </Text>
            <Text variant="body" numeric>
              {bot.currentQuantity} {bot.instrument}
            </Text>
          </View>
        </Card>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress}>
      <Card style={{ gap: spacing.lg }} borderColor={bot.status === 'ERROR' ? colors.danger : undefined}>
        {header}

        <View style={{ flexDirection: 'row', gap: spacing.xxl }}>
          <View>
            <Text variant="caption" color="muted">
              Risk profile
            </Text>
            <Text variant="body">{bot.riskProfile}</Text>
          </View>
          <View>
            <Text variant="caption" color="muted">
              Execution venue
            </Text>
            <Text variant="body">{bot.executionVenue}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text variant="caption" color="muted">
              Cantidad actual
            </Text>
            <Text variant="body" numeric>
              {bot.currentQuantity} {bot.instrument}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="caption" color="muted">
              Cantidad objetivo
            </Text>
            <Text variant="body" numeric color="secondary">
              {bot.targetQuantity} {bot.instrument}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
