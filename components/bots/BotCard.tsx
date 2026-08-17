import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../common/Text';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { BotGlyph } from './BotGlyph';
import { colors, radius, spacing } from '../../constants';
import { Bot } from '../../types';

// Only a PAUSED or STOPPED bot can be deleted — never one that's ACTIVE,
// mid-transition (PAUSING/RESUMING), or ERROR (which must be Stopped
// first). Mirrors the backend's own precondition exactly
// (BotService._DELETABLE_STATUSES) so the button never appears for a bot
// the API would reject anyway.
const DELETABLE_STATUSES: ReadonlySet<Bot['status']> = new Set(['PAUSED', 'STOPPED']);

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

// Text-and-emoji, never color-only — a colorblind user or a screenshot in
// grayscale must still be able to tell SIMULATION from LIVE at a glance.
const executionModeLabel: Record<Bot['executionMode'], string> = {
  SIMULATION: '🧪 SIMULACIÓN',
  LIVE: '🔴 LIVE',
};

const executionModeTone: Record<Bot['executionMode'], string> = {
  SIMULATION: colors.brand,
  LIVE: colors.danger,
};

interface Props {
  bot: Bot;
  variant?: 'compact' | 'full';
  onPress?: () => void;
  /** Present only for a PAUSED/STOPPED bot, and only when the caller wants
   * delete available here (e.g. the Bots list) — the caller owns the
   * confirmation dialog and the actual apiClient.deleteBot call, this
   * component only renders the trigger. */
  onDelete?: () => void;
}

export function BotCard({ bot, variant = 'full', onPress, onDelete }: Props) {
  const canDelete = onDelete !== undefined && DELETABLE_STATUSES.has(bot.status);

  const deleteButton = canDelete ? (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        onDelete!();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Eliminar bot ${bot.name}`}
      hitSlop={8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
      <Text variant="caption" color="muted">
        Eliminar
      </Text>
    </Pressable>
  ) : null;
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <BotGlyph riskProfile={bot.riskProfile} active={bot.status === 'ACTIVE'} />
      {/* minWidth: 0 overrides the flex item's default min-width: auto —
          without it, a flex:1 child never shrinks below its text's
          intrinsic width, so once the badge column on the right grew (two
          stacked badges instead of one), this column was forced narrower
          than any word in the name and wrapped character-by-character
          instead of truncating. numberOfLines+ellipsizeMode now truncate
          long names/instruments with "…" instead. */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="cardTitle" numberOfLines={1} ellipsizeMode="tail">
          {bot.name}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1} ellipsizeMode="tail">
          {assetClassLabel[bot.assetClass]} · {bot.instrument}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: spacing.xs, flexShrink: 0 }}>
        <Badge label={statusLabel[bot.status]} tone={statusTone[bot.status]} />
        <Badge label={executionModeLabel[bot.executionMode]} tone={executionModeTone[bot.executionMode]} />
      </View>
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
          {deleteButton}
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

        {deleteButton}
      </Card>
    </Pressable>
  );
}
