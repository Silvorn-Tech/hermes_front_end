import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../common/Text';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { BotGlyph } from './BotGlyph';
import { ExposureBar } from './ExposureBar';
import { colors, spacing } from '../../constants';
import { Bot } from '../../types';
import { formatPercent, formatRelativeTime } from '../../utils/format';

const statusLabel: Record<Bot['status'], string> = {
  active: 'Activo',
  paused: 'Pausado',
  alert: 'Alerta',
};

const statusTone: Record<Bot['status'], string> = {
  active: colors.success,
  paused: colors.textMuted,
  alert: colors.risk.alert,
};

interface Props {
  bot: Bot;
  variant?: 'compact' | 'full';
  onPress?: () => void;
  onToggleStatus?: () => void;
}

const botAccent: Record<string, string> = {
  sentinel: colors.bots.sentinel,
  equilibrium: colors.bots.equilibrium,
  vortex: colors.bots.vortex,
};

export function BotCard({ bot, variant = 'full', onPress, onToggleStatus }: Props) {
  const accent = botAccent[bot.id];

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <BotGlyph botId={bot.id} active={bot.status === 'active'} />
      <View style={{ flex: 1 }}>
        <Text variant="cardTitle">{bot.name}</Text>
        <Text variant="caption" color="muted">
          {bot.profile}
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Text variant="caption" color="muted">
                Retorno
              </Text>
              <Text variant="cardTitle" numeric style={{ color: bot.returnPct >= 0 ? colors.success : colors.danger }}>
                {formatPercent(bot.returnPct, { signed: true })}
              </Text>
            </View>
            <Text variant="caption" color="muted" style={{ maxWidth: '55%', textAlign: 'right' }}>
              {formatRelativeTime(bot.lastSignalAt)}
            </Text>
          </View>
          <Text variant="body" color="secondary" numberOfLines={2}>
            {bot.lastSignalSummary}
          </Text>
        </Card>
      </Pressable>
    );
  }

  return (
    <Card style={{ gap: spacing.lg }} borderColor={bot.status === 'alert' ? colors.risk.alert : undefined}>
      {/* Navigation target excludes the action button below, so the two never fight over the same touch. */}
      <Pressable onPress={onPress} style={{ gap: spacing.lg }}>
        {header}

        <View style={{ flexDirection: 'row', gap: spacing.xxl }}>
          <View>
            <Text variant="caption" color="muted">
              Performance
            </Text>
            <Text variant="heading" numeric style={{ color: bot.returnPct >= 0 ? colors.success : colors.danger }}>
              {formatPercent(bot.returnPct, { signed: true })}
            </Text>
          </View>
        </View>

        <ExposureBar pct={bot.exposure.pct} limitPct={bot.exposure.limitPct} color={accent} />

        <View style={{ gap: spacing.xs }}>
          <Text variant="caption" color="muted">
            Último signal · {formatRelativeTime(bot.lastSignalAt)}
          </Text>
          <Text variant="body" color="secondary">
            {bot.lastSignalSummary}
          </Text>
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label={bot.status === 'paused' ? 'Reanudar' : 'Pausar'}
          variant="secondary"
          onPress={() => onToggleStatus?.()}
          style={{ flex: 1 }}
        />
      </View>
    </Card>
  );
}
