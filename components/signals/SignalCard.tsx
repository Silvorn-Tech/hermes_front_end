import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from '../common/Text';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { BotGlyph } from '../bots/BotGlyph';
import { colors, spacing, radius, motion } from '../../constants';
import { ActivityEvent, RiskProfile, Signal, SignalLevel } from '../../types';
import { formatRelativeTime } from '../../utils/format';

const levelMeta: Record<SignalLevel, { label: string; color: string }> = {
  ambient: { label: 'Ambient', color: colors.textMuted },
  insight: { label: 'Insight', color: colors.aiAccent },
  signal: { label: 'Signal', color: colors.aiAccent },
  alert: { label: 'Alert', color: colors.risk.alert },
  action_required: { label: 'Acción requerida', color: colors.risk.critical },
};

const sourceLabel: Record<Signal['source'], string> = {
  sentinel: 'Sentinel',
  equilibrium: 'Equilibrium',
  vortex: 'Vortex',
  risk: 'Risk',
  system: 'Sistema',
};

// Signals/Activity remain mock — this repo's mock data still labels a
// signal's originating bot with these 3 legacy strings, which no longer
// resolve to any real bot (real bots have arbitrary backend-issued ids).
// This mapping exists only to color the mock signal's glyph; it's never
// used to navigate anywhere or treated as real bot data.
const mockBotRiskProfile: Record<string, RiskProfile> = {
  sentinel: 'SENTINEL',
  equilibrium: 'EQUILIBRIUM',
  vortex: 'VORTEX',
};

interface Props {
  signal: Signal;
  relatedEvents: ActivityEvent[];
}

/** Where "Revisar" for this signal should actually take the user — real
 * navigation to the screen that owns the relevant data, never a dead
 * button. Only risk-sourced signals have a real target: a signal's mock
 * `botId` no longer resolves to a real bot (see mockBotRiskProfile above),
 * so that button simply isn't rendered rather than 404ing on a fabricated
 * link. */
function resolveActionRoute(signal: Signal): string | undefined {
  if (signal.source === 'risk') return '/risk';
  return undefined;
}

export function SignalCard({ signal, relatedEvents }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const meta = levelMeta[signal.level];
  const isActionRequired = signal.level === 'action_required';
  const isEmphasized = signal.level === 'alert' || isActionRequired;
  const actionRoute = resolveActionRoute(signal);

  return (
    <Card
      emphasizedBorder={isActionRequired}
      borderColor={isEmphasized ? meta.color : undefined}
      style={{ gap: spacing.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        {signal.botId && mockBotRiskProfile[signal.botId] ? (
          <BotGlyph riskProfile={mockBotRiskProfile[signal.botId]} size={28} />
        ) : (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: radius.full,
              backgroundColor: `${meta.color}1F`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={signal.source === 'risk' ? 'shield-outline' : 'sparkles-outline'} size={14} color={meta.color} />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text variant="caption" style={{ color: meta.color }}>
              {meta.label}
            </Text>
            <Text variant="caption" color="muted">
              · {sourceLabel[signal.source]} · {formatRelativeTime(signal.timestamp)}
            </Text>
          </View>
          <Text variant="cardTitle">{signal.headline}</Text>
        </View>
      </View>

      <Text variant="body" color="secondary">
        {signal.body}
      </Text>

      {relatedEvents.length > 0 ? (
        <Pressable onPress={() => setExpanded((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
          <Text variant="caption" color="muted">
            {expanded ? 'Ocultar actividad relacionada' : `Ver actividad relacionada (${relatedEvents.length})`}
          </Text>
        </Pressable>
      ) : null}

      {expanded ? (
        <View style={{ gap: spacing.sm, paddingLeft: spacing.md, borderLeftWidth: 1, borderLeftColor: colors.border }}>
          {relatedEvents.map((event) => (
            <View key={event.id}>
              <Text variant="body" color="secondary">
                {event.description}
              </Text>
              <Text variant="caption" color="muted">
                {formatRelativeTime(event.timestamp)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {isActionRequired && signal.actionLabel && actionRoute ? (
        <Button label={signal.actionLabel} variant="danger" onPress={() => router.push(actionRoute as any)} />
      ) : null}
    </Card>
  );
}
