import React from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DetailDrawer } from '../../../components/common/DetailDrawer';
import { Text } from '../../../components/common/Text';
import { Section } from '../../../components/common/Section';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { BotGlyph } from '../../../components/bots/BotGlyph';
import { ExposureBar } from '../../../components/bots/ExposureBar';
import { RiskStateBadge } from '../../../components/risk/RiskState';
import { SignalCard } from '../../../components/signals/SignalCard';
import { useHermesData } from '../../../hooks/HermesDataContext';
import { colors, spacing, bots as botColors } from '../../../constants';
import { BotId } from '../../../types';
import { formatPercent, formatRelativeTime } from '../../../utils/format';

const statusLabel = { active: 'Activo', paused: 'Pausado', alert: 'Alerta' } as const;
const statusTone = { active: colors.success, paused: colors.textMuted, alert: colors.risk.alert } as const;

export default function BotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { bots, activityEvents, signals, risk, toggleBotStatus } = useHermesData();

  const bot = bots.find((b) => b.id === id);

  if (!bot) {
    return (
      <DetailDrawer title="Bot" onClose={() => router.back()}>
        <EmptyState title="Bot no encontrado." />
      </DetailDrawer>
    );
  }

  const botId = bot.id as BotId;
  const accent = botColors[botId];
  const botEvents = activityEvents.filter((e) => e.botId === botId);
  const botSignals = signals.filter((s) => s.botId === botId);
  const riskLevel = risk.riskByBot[botId];

  return (
    <DetailDrawer title={bot.name} onClose={() => router.back()}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xxl }}>
        <Section title="Header">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <BotGlyph botId={botId} size={44} active={bot.status === 'active'} />
            <View style={{ flex: 1 }}>
              <Text variant="heading">{bot.name}</Text>
              <Text variant="body" color="muted">
                {bot.profile}
              </Text>
            </View>
            <Badge label={statusLabel[bot.status]} tone={statusTone[bot.status]} />
          </View>
          <Button
            label={bot.status === 'paused' ? 'Reanudar' : 'Pausar'}
            variant="secondary"
            onPress={() => toggleBotStatus(botId)}
          />
        </Section>

        <Section title="Performance">
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text variant="caption" color="muted">
                Retorno
              </Text>
              <Text variant="heading" numeric style={{ color: bot.returnPct >= 0 ? colors.success : colors.danger }}>
                {formatPercent(bot.returnPct, { signed: true })}
              </Text>
            </View>
          </Card>
        </Section>

        <Section title="Exposure">
          <Card>
            <ExposureBar pct={bot.exposure.pct} limitPct={bot.exposure.limitPct} color={accent} />
          </Card>
        </Section>

        <Section title="Risk">
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="body" color="secondary">
              Estado de riesgo de {bot.name}
            </Text>
            <RiskStateBadge level={riskLevel} />
          </Card>
        </Section>

        <Section title="Strategy">
          <Card>
            <Text variant="body" color="secondary">
              {bot.strategyDescription}
            </Text>
          </Card>
        </Section>

        <Section title="Activity">
          {botEvents.length === 0 ? (
            <EmptyState title="Sin actividad reciente para este bot." />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {botEvents.map((event) => (
                <View key={event.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                  <Text variant="body" color="secondary" style={{ flex: 1 }}>
                    {event.description}
                  </Text>
                  <Text variant="caption" color="muted">
                    {formatRelativeTime(event.timestamp)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title="Signals">
          {botSignals.length === 0 ? (
            <EmptyState title="Hermes aún no tiene nada que interpretar." />
          ) : (
            <View style={{ gap: spacing.md }}>
              {botSignals.map((signal) => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  relatedEvents={activityEvents.filter((e) => signal.relatedEventIds.includes(e.id))}
                />
              ))}
            </View>
          )}
        </Section>
      </ScrollView>
    </DetailDrawer>
  );
}
