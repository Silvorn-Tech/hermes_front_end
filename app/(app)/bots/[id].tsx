import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DetailDrawer } from '../../../components/common/DetailDrawer';
import { Text } from '../../../components/common/Text';
import { Section } from '../../../components/common/Section';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { PreviewBanner } from '../../../components/common/PreviewBanner';
import { BotGlyph } from '../../../components/bots/BotGlyph';
import { ExposureBar } from '../../../components/bots/ExposureBar';
import { RiskStateBadge } from '../../../components/risk/RiskState';
import { SignalCard } from '../../../components/signals/SignalCard';
import { useHermesData } from '../../../hooks/HermesDataContext';
import { colors, spacing, bots as botColors } from '../../../constants';
import { BotId } from '../../../types';
import { formatPercent, formatRelativeTime } from '../../../utils/format';

const statusLabel = { ACTIVE: 'Activo', PAUSED: 'Pausado', STOPPED: 'Detenido', ERROR: 'Error' } as const;
const statusTone = { ACTIVE: colors.success, PAUSED: colors.textMuted, STOPPED: colors.textMuted, ERROR: colors.danger } as const;
const assetClassLabel = { CRYPTO: 'Crypto', EQUITY: 'Equity', TOKENIZED_EQUITY: 'Tokenized Equity' } as const;
const venueLabel = { BINANCE: 'Binance' } as const;
const strategyLabel = {
  SIGNAL_BASED: 'Signal based',
  REGIME_BASED: 'Regime based',
  GARCH: 'GARCH',
  MONTE_CARLO: 'Monte Carlo',
} as const;

export default function BotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { bots, activityEvents, signals, risk, setBotLifecycleStatus } = useHermesData();
  const [stopConfirmVisible, setStopConfirmVisible] = useState(false);
  const [closePositionsConfirmVisible, setClosePositionsConfirmVisible] = useState(false);
  const [closePositionsPending, setClosePositionsPending] = useState(false);

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
  const isLive = bot.status === 'ACTIVE' || bot.status === 'PAUSED';

  return (
    <DetailDrawer title={bot.name} onClose={() => router.back()}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xxl }}>
        <PreviewBanner
          variant="preview"
          label="Vista previa — Bot API pendiente de backend"
          description="Los cambios de estado no se persisten y se reinician al recargar."
        />

        <Section title="Header">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <BotGlyph botId={botId} size={44} active={bot.status === 'ACTIVE'} />
            <View style={{ flex: 1 }}>
              <Text variant="heading">{bot.name}</Text>
              <Text variant="body" color="muted">
                {bot.profile}
              </Text>
            </View>
            <Badge label={statusLabel[bot.status]} tone={statusTone[bot.status]} />
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {isLive ? (
              <Button
                label={bot.status === 'PAUSED' ? 'Reanudar' : 'Pausar'}
                variant="secondary"
                onPress={() => setBotLifecycleStatus(botId, bot.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED')}
                style={{ flex: 1 }}
              />
            ) : null}
            {isLive ? (
              <Button label="Detener" variant="danger" onPress={() => setStopConfirmVisible(true)} style={{ flex: 1 }} />
            ) : null}
            <Button
              label="Editar"
              variant="secondary"
              onPress={() => router.push(`/bots/form?id=${botId}` as any)}
              style={{ flex: 1 }}
            />
          </View>

          <Button
            label="Cerrar posiciones"
            variant="danger"
            onPress={() => setClosePositionsConfirmVisible(true)}
            fullWidth
          />
          {closePositionsPending ? (
            <PreviewBanner
              variant="pending"
              label="Integración con backend pendiente"
              description="Cerrar posiciones por bot requiere asociar posiciones reales a un bot en el backend — todavía no existe esa relación."
            />
          ) : null}
        </Section>

        <Section title="Configuración">
          <Card style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" color="muted">
                Asset class
              </Text>
              <Text variant="body">{assetClassLabel[bot.assetClass]}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" color="muted">
                Execution venue
              </Text>
              <Text variant="body">{venueLabel[bot.executionVenue]}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" color="muted">
                Strategy / Model
              </Text>
              <Text variant="body">{strategyLabel[bot.strategyModel]}</Text>
            </View>
          </Card>
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

      <ConfirmDialog
        visible={stopConfirmVisible}
        title="Detener bot"
        description={`Vas a detener ${bot.name}. Un bot detenido no puede reanudarse desde aquí.`}
        confirmLabel="Detener"
        destructive
        onConfirm={() => {
          setBotLifecycleStatus(botId, 'STOPPED');
          setStopConfirmVisible(false);
        }}
        onCancel={() => setStopConfirmVisible(false)}
      />

      <ConfirmDialog
        visible={closePositionsConfirmVisible}
        title="Cerrar posiciones"
        description={`Vas a cerrar todas las posiciones de ${bot.name}. Esta acción no se puede deshacer.`}
        confirmLabel="Cerrar posiciones"
        destructive
        onConfirm={() => {
          setClosePositionsConfirmVisible(false);
          setClosePositionsPending(true);
        }}
        onCancel={() => setClosePositionsConfirmVisible(false)}
      />
    </DetailDrawer>
  );
}
